# Database Management Guide

This guide explains how to work with the separate preview and production databases in the Slynk project.

## Setting Up Databases

To set up your preview and production databases:

```bash
# Run the database setup script
pnpm setup-db
```

This interactive script will ask you for:
1. Preview database URL (e.g. `postgresql://username:password@host:port/preview_db`)
2. Production database URL (e.g. `postgresql://username:password@host:port/production_db`)

After configuration, you can select which environment to activate.

## Switching Between Environments

To switch between preview and production databases:

```bash
# Interactive switching
pnpm switch-db

# Direct commands
pnpm db-preview    # Switch to preview + sync schema
pnpm db-production # Switch to production + sync schema
```

## Making Database Changes

When making changes that affect the database:

1. **Schema Changes**: Modify the Prisma schema.prisma file as usual
2. **Generate Migrations**: Use the migration tool to update both databases

```bash
# Generate migrations for both databases
pnpm migrate

# Apply existing migrations to both databases
pnpm migrate:deploy
```

## Environment Variables

The current environment is tracked using the `DATABASE_ENV` variable in your .env.local file.

In code, you can check which database you're connected to:

```typescript
// Log which database is being used
if (process.env.NODE_ENV === 'development') {
  console.log(`Using ${process.env.DATABASE_ENV} database`);
}
```

## Best Practices

1. **Preview First**: Make and test changes in the preview database first
2. **Keep in Sync**: Regularly apply migrations to both databases
3. **Environment Awareness**: Consider adding environment indicators in your UI during development
4. **Backup**: Create regular backups of your production database

## Troubleshooting

- **Missing Environment Files**: Run `pnpm setup-db` to create them
- **Database Connection Issues**: Check your database URLs in .env.preview and .env.production
- **Migration Conflicts**: Delete conflicting migrations and regenerate them 