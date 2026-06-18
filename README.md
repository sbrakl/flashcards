# Flash Card

This is a flash card app built with Next.js, Supabase, and OpenRouter's DeepSeek V4 Flash model. It allows users to create and study flash cards, with a special "Memorizer" card type that uses bullet points for answers and provides AI-generated feedback.

It features:
- A category editor with an `is_memorizer` toggle to designate memorizer cards
- Validation for bullet-point format on memorizer cards
- An API route that compares user answers to correct answers using AI and returns hints or Socratic questions for missing points
- A study mode that iterates until the user is satisfied with their answer, allowing them to rate their performance

# Home Page

![Home Page Screenshot](./docs/images/Homepage.png)

You can create an account or log in to access your flash cards. The app uses Supabase for authentication and data storage.
![Login Page Screenshot](./docs/images/loginpage.png)


# Environment Variables
Make sure to set the following environment variables in your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
OPENROUTER_API_KEY=your_openrouter_api_key
```

# Supabase Setup
1. Create a new project on [Supabase](https://supabase.com/).
2. Use the provided SQL migration file (`./supabase/migrations/20260611182235_remote_schema.sql`) to set up the database schema. You can run this SQL in the Supabase SQL editor to create the necessary tables and functions.
3. Migrate the schema to your Supabase project and ensure that the tables are created successfully.

# Supabase Schema
Supabase base schema is at supabase/migrations/20260611182235_remote_schema.sql 

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
