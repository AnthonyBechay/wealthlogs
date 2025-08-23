# Vercel Deployment - CORRECT Configuration

## ✅ FIXED vercel.json

The error was caused by trying to navigate outside the project directory. Vercel doesn't allow `cd ../..` because it sandboxes the build environment.

### Correct vercel.json (in wealthlogs-code/)
```json
{
  "framework": "nextjs",
  "outputDirectory": "apps/web/.next",
  "buildCommand": "npm run build:web",
  "installCommand": "npm ci --workspaces --include-workspace-root"
}
```

## Vercel Dashboard Settings

Make sure these settings are correct in your Vercel dashboard:

### General Settings
- **Framework Preset:** Next.js
- **Root Directory:** `wealthlogs-code` ← IMPORTANT!
- **Include source files outside of Root Directory:** OFF

### Build & Development Settings
- **Build Command:** `npm run build:web` (or leave empty to use vercel.json)
- **Output Directory:** `apps/web/.next` (or leave empty to use vercel.json)
- **Install Command:** `npm ci --workspaces --include-workspace-root` (or leave empty to use vercel.json)

### Environment Variables
```
NEXT_PUBLIC_API_URL=https://wealthlog-backend-hx43.onrender.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

## How Vercel Build Works

1. **Vercel clones your repo**
2. **Changes to the Root Directory** you specified (`wealthlogs-code`)
3. **Reads vercel.json** from that directory
4. **Runs Install Command:** `npm ci --workspaces --include-workspace-root`
   - This installs all dependencies for the monorepo
5. **Runs Build Command:** `npm run build:web`
   - This runs `turbo run build --filter=@wealthlog/web...`
   - Turbo builds shared packages first, then the web app
6. **Outputs from:** `apps/web/.next`

## Common Errors and Solutions

### Error: "Could not read package.json"
**Cause:** Trying to navigate outside root directory
**Solution:** Don't use `cd ../..` in commands

### Error: "Cannot find module 'turbo'"
**Cause:** Dependencies not installed
**Solution:** Ensure installCommand includes `--workspaces --include-workspace-root`

### Error: "No such file or directory"
**Cause:** Wrong root directory setting
**Solution:** Set root directory to `wealthlogs-code` in Vercel dashboard

## Verification Steps

1. **Check your Vercel dashboard settings:**
   - Go to your project settings
   - Verify Root Directory is `wealthlogs-code`
   - Clear any override commands (let vercel.json handle it)

2. **Test locally first:**
   ```bash
   cd wealthlogs-code
   npm ci --workspaces --include-workspace-root
   npm run build:web
   ```
   This should complete without errors.

3. **Deploy:**
   ```bash
   git add wealthlogs-code/vercel.json
   git commit -m "fix: correct vercel.json build command"
   git push origin main
   ```

4. **Monitor deployment:**
   - Check Vercel dashboard for build logs
   - Build should complete in 2-3 minutes

## Alternative: Using Vercel CLI

If dashboard deployment fails, try CLI:

```bash
cd wealthlogs-code
npx vercel --prod
```

When prompted:
- Set up and deploy: Y
- Which scope: (your account)
- Link to existing project: Y (if exists)
- What's the name: (your project name)
- Root directory: ./ (current directory since we're already in wealthlogs-code)

## Summary

The key issue was the build command trying to navigate outside the allowed directory. Vercel sandboxes the build environment to the root directory you specify. The fix is to:

1. ✅ Use simple commands that work within `wealthlogs-code`
2. ✅ Let npm workspaces handle the monorepo structure
3. ✅ Use the predefined npm scripts (`npm run build:web`)

The deployment should now work correctly!
