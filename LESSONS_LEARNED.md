# Tempa Co AI — Client Portal: Lessons Learned

Development log dan catatan teknis selama membangun tempaco.ai client portal.

---

## Timeline

### 18 Oktober 2026 — Setup Awal & Login Gagal

**Problem:** Login tidak berfungsi sama sekali di production (Hostinger). User klik login, tidak terjadi apa-apa atau error.

**Root Cause:**
1. **Environment variables tidak ter-bundle.** File `.env.local` berisi placeholder, bukan kredensial Supabase yang sebenarnya. Karena `.env*` ada di `.gitignore`, Hostinger tidak punya akses ke env vars dari repo.
2. **`getUser()` vs `getSession()`.** AuthProvider awalnya pakai `supabase.auth.getUser()` yang butuh server-side call. Karena Next.js di-deploy sebagai static export (`output: "export"`), tidak ada server — harus pakai `getSession()` yang baca dari cookie/localStorage di client side.

**Fix:**
- Set `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` langsung di **Hostinger Dashboard > Environment Variables** (bukan lewat `.env.local` di repo).
- Ganti `getUser()` ke `getSession()` di AuthProvider.

**Lesson:**
- Static export = client-side only. Semua auth flow harus pakai `getSession()`, bukan `getUser()`.
- Env vars untuk Hostinger shared hosting harus di-set manual di dashboard karena `.env*` di-gitignore.
- Selalu pastikan env vars yang di-bundle oleh Next.js pakai prefix `NEXT_PUBLIC_`.

---

### 18 Oktober 2026 — Theme System & Light Mode

**Task:** Implementasi dark/light mode toggle.

**Approach:**
- CSS custom properties di `:root` untuk dark mode (default) dan `[data-theme="light"]` untuk light mode.
- `ThemeProvider` context yang baca/tulis `data-theme` attribute di `<html>` dan simpan preference di `localStorage`.
- Tombol toggle (Sun/Moon icon) di sidebar DashboardLayout.

**Issue ditemukan:** Banyak class `text-white` yang hardcoded di seluruh komponen — ini bikin teks invisible di light mode (putih di background putih).

**Fix:** Ganti semua `text-white` ke `text-foreground` dan `bg-white/5` ke `bg-foreground/5` di:
- `DashboardLayout.tsx`
- `invoices/page.tsx`
- `messages/page.tsx`
- `projects/page.tsx`
- `settings/page.tsx`
- `admin/page.tsx`
- `admin/clients/page.tsx`

**Exception:** `login/page.tsx` tetap pakai `text-white` karena halaman login selalu dark background.

**Lesson:**
- Jangan hardcode warna — selalu pakai CSS custom properties/token (`text-foreground`, `bg-card`, dll).
- Audit semua komponen saat implementasi theme system, bukan cuma komponen utama.

---

### 19 Oktober 2026 — Admin Menu Tidak Muncul (Login Sebagai Admin Gagal)

**Problem:** Login berhasil, tapi user admin (`dariellambert@tempaco.ai`) hanya melihat Client Portal view — menu Admin dan Clients tidak muncul di sidebar. Role admin tidak terbaca.

**Debugging process:**
1. Tambah console.log di `AuthProvider.fetchProfile()` untuk lihat error dari Supabase.
2. Cek env vars — `NEXT_PUBLIC_SUPABASE_URL` ternyata `SET` (bukan masalah env vars).
3. Error dari Supabase: **`infinite recursion detected in policy for relation "profiles"` (error code 42P17)**.

**Root Cause:** RLS policy `"Admin can view all profiles"` di tabel `profiles` punya `USING` clause:
```sql
EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
```
Policy ini query ke tabel `profiles` sendiri — yang trigger RLS check lagi — yang trigger policy lagi — infinite recursion!

**Fix:**
1. Buat function `public.is_admin()` dengan `SECURITY DEFINER` (bypass RLS):
   ```sql
   CREATE OR REPLACE FUNCTION public.is_admin()
   RETURNS boolean AS $$
     SELECT EXISTS (
       SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
     );
   $$ LANGUAGE sql SECURITY DEFINER;
   ```
2. Drop old policy dan buat baru:
   ```sql
   DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
   CREATE POLICY "Admin can view all profiles" ON profiles FOR SELECT USING (public.is_admin());
   ```
3. Fix juga semua admin policies di tabel lain (projects, invoices, messages) yang pakai subquery pattern yang sama — meskipun tidak recursive di tabel sendiri, lebih clean dan konsisten pakai `is_admin()`.

**Catatan teknis:**
- `SECURITY DEFINER` function berjalan dengan privilege si creator function (biasanya superuser), jadi bypass RLS. Ini standard pattern untuk avoid recursion.
- Supabase MCP tool (`execute_sql` dan `apply_migration`) menolak `DROP POLICY` statements (status: cancelled) — kemungkinan karena dianggap destructive. Harus dijalankan manual via **Supabase SQL Editor**.

**Lesson:**
- **JANGAN** buat RLS policy yang query ke tabel sendiri — ini akan selalu infinite recursion.
- Gunakan `SECURITY DEFINER` function untuk role-check yang dipakai di RLS policy.
- Supabase MCP punya limitasi untuk DDL destructive — siapkan fallback via SQL Editor.
- Selalu cek browser console untuk error Supabase yang spesifik — error message-nya informatif.

---

## Architecture Notes

### Stack
- **Framework:** Next.js 16 (static export, `output: "export"`)
- **Styling:** Tailwind CSS v4 + CSS custom properties
- **Backend:** Supabase (Auth, PostgreSQL, RLS)
- **Hosting:** Hostinger shared hosting (static files, no Node.js runtime)
- **Deploy:** Git auto-deploy dari `main` branch → `npm run build` → serve `out/`

### Key Constraints
- Hostinger shared hosting = static files only. No SSR, no API routes, no middleware.
- Semua data fetching harus client-side (useEffect + Supabase client).
- Auth harus pakai `getSession()` (client-side), bukan `getUser()` (server-side).
- Env vars di-set di Hostinger dashboard, bukan via `.env` file di repo.

### Supabase Project
- Project ID: `znwfjtpoojmthmddjxhu`
- Admin: `dariellambert@tempaco.ai`
- Test client: `dariellamberto@gmail.com`
- RLS: enabled on all tables, admin check via `public.is_admin()` function
