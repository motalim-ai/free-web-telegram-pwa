# Stage 1–2: from an idea to an approved plan

## What fits this stack well (say yes confidently)

Anything with **people who come back** and **an owner who manages things**:

| Idea | Customer side | Owner dashboard | Bot messages |
|---|---|---|---|
| Small store (the template) | browse, cart, order | products, orders, banners | new order → confirm/cancel; status updates to the buyer |
| Bookings (salon, clinic, tutor) | pick a free slot, book | working hours, bookings | new booking; reminder before the slot |
| Restaurant menu & orders | menu, order for pickup/delivery | menu, orders | new order |
| Courses / lessons | lessons, progress, quizzes | lessons, students | new lesson published |
| Contests / quizzes for a channel | answer, leaderboard | questions, winners | results |
| Loyalty card | QR card, stamps | scan QR (Telegram's camera), rewards | "2 stamps to a free coffee" |

## What is not free or not in this first version (be upfront)

- **Online card payments** need a payment company account (Moyasar, Tap, Paymob, Stripe…). Offer cash on delivery and bank transfer with a receipt photo (already in the template).
- **Large videos**: storing many videos needs Cloudflare R2, which asks for a card on file. Offer YouTube unlisted links or Telegram channel posts.
- **Your own domain** (`.com`): optional, ~10 USD/year. The free address is `name.account.workers.dev`.
- **Sending SMS/emails** needs a paid provider; Telegram bot messages are free and already built in.
- **Heavy traffic**: the free plan handles ~100,000 requests per day, plenty for a small business.

## How to write the plan

- Keep version 1 **small**: the shortest path for a customer to do the main action, and the owner to handle it.
- Map every feature onto the template's parts (see `3-build.md`): sign-in, dashboard, bot notifications, PWA are free to reuse.
- Choose a **brand color** and a **symbol** from `bag, cup, calendar, book, star, chat, heart` (the user can upload a real logo later from the dashboard).
- Always list what is **not** included, so expectations are clear.
- Customer-facing text in the app: simple Modern Standard Arabic, right-to-left.
- Prices: ask which currency (default ر.س). Cities/phone format follow the user's country (the template defaults to Saudi Arabia: +966, Saudi cities; change `CITIES` and the phone hint for other countries).
