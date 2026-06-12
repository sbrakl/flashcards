# How to run the Supabase Migration

Awesome! Disabling analytics is the perfect way to get around that Colima socket-mounting quirk. Now that your local Supabase containers are running smoothly, you have a complete, isolated database playground ready to go.

Here are the final steps to create, test, and deploy your new `is_memorizer` column safely.

---

### Step 1: Verify Your Local Schema

First, let's make sure your local environment accurately reflects your remote schema. When you ran `supabase db pull` earlier, it created a baseline script inside your project at `supabase/migrations/<timestamp>_remote_schema.sql`.

Run a local reset to ensure that baseline script is fully applied to your local Docker containers:

```bash
DOCKER_HOST=unix://$HOME/.colima/default/docker.sock supabase db reset

```

*Note: You can open your browser and navigate to **`http://localhost:54321`** to access the local **Supabase Studio Dashboard**. If you click on the Table Editor, you should see your `fc_flashcards` table exactly as it exists on your remote database.*

---

### Step 2: Create a New Migration File

Now, generate a brand-new, empty migration file specifically for your column change:

```bash
supabase migration new add_is_memorizer_to_fc_flashcards

```

This will create a new file in your project directory: `supabase/migrations/<timestamp>_add_is_memorizer_to_fc_flashcards.sql`.

---

### Step 3: Add the SQL Script

Open that newly created `.sql` file in your code editor (like VS Code) and paste the migration snippet:

```sql
ALTER TABLE "public"."fc_flashcards" 
ADD COLUMN "is_memorizer" boolean DEFAULT false NOT NULL;

```

Save and close the file.

---

### Step 4: Test Your Migration Locally

Before touching your production database, let's make sure this script runs cleanly on top of your baseline schema:

```bash
DOCKER_HOST=unix://$HOME/.colima/default/docker.sock supabase db reset

```

If the command finishes without errors, your local database now officially has the `is_memorizer` column. Go back to your local Studio Dashboard (`http://localhost:54321`), refresh the page, and verify that the column is visible on the `fc_flashcards` table with a default value of `false`.

---

### Step 5: Push to Your Remote Database

Once you are completely satisfied that your local tests passed and everything works as expected, deploy this change to your live remote project:

```bash
supabase db push --db-url "postgres://postgres.swffrwezqqayucpjtjeq:your_actual_password@aws-0-[region].pooler.supabase.com:5432/postgres"

```

*(Remember to use your URL-encoded password and your session pooler string from earlier to bypass the IPv6 lookup issue).*

---

Once this pushes successfully, your live database is updated!

Would you like to update your local `.env.local` variables now so your Next.js application runs against this local database environment while you build out the frontend code for the memorizer feature?