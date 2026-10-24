# Stage 3: guiding the user through the accounts ("guide me" path)

Go one step at a time. After each step, verify, then send the next step. Messages to the user in Arabic.

## Step A — Cloudflare account

> افتح هذا الرابط وأنشئ حساباً مجانياً بالبريد الإلكتروني: https://dash.cloudflare.com/sign-up
> بعد التسجيل افتح بريدك واضغط رابط التفعيل. أخبرني عندما تنتهي.

No command can verify this step alone; it is verified in step B.

## Step B — Connect this computer to Cloudflare

> افتح التيرمنال واكتب هذا السطر، ثم اضغط Enter:
> ```
> cd "<absolute project path>" && npx wrangler login
> ```
> سيفتح المتصفح على صفحة Cloudflare، اضغط **Allow**، ثم ارجع وأخبرني.

Verify: `npx wrangler whoami` must show "You are logged in". Report the email it shows (that is not a secret) so the user confirms it is their account.

If it fails: the browser didn't open → copy the URL that wrangler prints and open it manually; "not authenticated" → run `npx wrangler login` again.

## Step C — Create the bot with @BotFather

> 1. في تيليجرام ابحث عن **@BotFather** واختر الحساب الموثّق (عليه علامة زرقاء).
> 2. أرسل: `/newbot`
> 3. اكتب اسم البوت (أي اسم).
> 4. اكتب معرّف البوت، ويجب أن ينتهي بـ `bot`، مثل `my_shop_bot`. إن قال إنه مستخدم، جرّب معرفاً آخر.
> 5. سيرسل لك التوكن. **لا ترسله لي.** افتح الملف `<absolute path>/.dev.vars` وابحث عن السطر `# BOT_TOKEN=`، احذف `#` من أوله، والصق التوكن بعد `=` مباشرة، واحفظ.

Verify: `npm run bot:check`. It never prints the token. It also fixes the most common mistake (a `#` left at the start of the line) by itself. On success it prints the bot's @username: confirm it with the user.

Common problems: "does not look like a bot token" → extra spaces/quotes or only part copied; "Telegram rejected it" → token revoked or mistyped, copy again from BotFather (`/token`).

## Step D — Make the user the owner

> افتح البوت الجديد في تيليجرام واضغط **Start** (أو أرسل `/start`)، ثم أخبرني.

Verify: `npm run bot:check` lists who messaged the bot. If exactly one person did and ADMIN_IDS is empty, it saves their id in `.dev.vars` automatically. Show the user the name it found and confirm it is them. If nobody appears, the message went to another bot: ask them to open the bot by its @username.

Important: run this **before** `npm run bot:setup`. After the webhook is set, Telegram stops keeping messages for `getUpdates`.
