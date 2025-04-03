# Changesets

This directory contains "changesets" which help us manage versioning and changelogs.

## What is a Changeset?

A changeset is a piece of information about changes made in a pull request that is used to:
- Describe changes to consumers
- Bump versions of packages
- Generate changelogs
- Organize package versions

## How to Use Changesets

### Creating a Changeset

When you make changes to the codebase, you should create a changeset:

```bash
pnpm changeset
```

The CLI will ask:
1. Which packages have changed
2. The type of change for each package (patch, minor, or major)
3. A message describing the changes

A Markdown file will be created in this directory, which you should commit with your changes.

### Bumping Versions

When it's time to release, use:

```bash
pnpm version
```

This will:
- Update versions in package.json files
- Generate/update changelogs
- Remove the changeset files

### Deploying

After updating versions, you can deploy packages using:

```bash
# Deploy a specific package (e.g., frontend)
pnpm deploy-to-s3:frontend

# Or deploy using the generic script
pnpm deploy-to-s3 --package @dialogue-foundry/my-package --bucket my-bucket
```

## Best Practices

1. Create a changeset for every meaningful change
2. Use semantic versioning correctly:
   - `patch`: Bug fixes and non-user-facing changes
   - `minor`: New features (backward compatible)
   - `major`: Breaking changes
3. Write clear, user-focused changeset messages
4. Make sure your changeset only appears in one pull request

For more information, see [VERSIONING.md](../VERSIONING.md).
