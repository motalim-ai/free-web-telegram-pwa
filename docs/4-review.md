# Stage 5: local run and review loop

1. Start `npm run dev` in the background (port 5174, fixed). If the port is busy, stop the old server instead of changing the port.
2. Check before showing the user: home page loads, the main flow works end to end (e.g. add to cart → checkout → order page), `/admin` opens with «دخول تجريبي», the new item shows in the dashboard, phone width (375px) and desktop both look right.
3. Send the stage 5 message from `AGENTS.md`.
4. For each change request: make it, check it, and reply with **what changed** in 1–3 short lines, then ask again:
   > هل توافق الآن، أم تريد تعديلاً آخر؟
5. Keep `PROGRESS.md` updated with the requested changes.

What the user cannot test locally (say so plainly): opening inside Telegram, bot messages, installing on a phone. These are tested after publishing.

Optional, for the curious: the app can be opened "as if from Telegram" locally by signing test `initData` with the real bot token. Do it only if the user asks; never print the signed data or the token.
