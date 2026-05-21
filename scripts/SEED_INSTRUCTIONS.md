# Seed admin + test employees

## 1. Add service role key (one-time)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project **pjkaatxonskfkdqqcowy**
2. **Settings** → **API**
3. Copy **service_role** key (secret — not the anon key)
4. Add to `.env.local`:

```env
SUPABASE_SERVICE_ROLE_KEY=eyJ...your_service_role_key...
```

## 2. Run the seed script

```bash
npm run seed
```

This creates/updates all accounts below.

## 3. Login credentials

### Admin

| Field | Value |
|-------|--------|
| Email | `admin@tantech-llc.com` |
| Password | `Admin@Tantech23` |
| Route after login | `/admin` |

### Test employees (password for all: `Employee@123`)

| Name | Email | Employee ID |
|------|-------|-------------|
| John Smith | john.smith@tantech-llc.com | EMP001 |
| Sarah Jones | sarah.jones@tantech-llc.com | EMP002 |
| Mike Chen | mike.chen@tantech-llc.com | EMP003 |
| Lisa Patel | lisa.patel@tantech-llc.com | EMP004 |

Employees land on `/home` after login (no forced password change).

## Troubleshooting

If admin signup was attempted earlier and login says **Email not confirmed**, either:

- Run `npm run seed` after adding the service role key (recommended), or
- In Supabase **Authentication** → **Users**, confirm the user manually, or
- Turn off **Confirm email** under **Authentication** → **Providers** → **Email**
