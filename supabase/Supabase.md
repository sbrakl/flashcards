# How to run local copy of Supabase Database

Setting up a local Supabase database means running a complete clone of the Supabase ecosystem (including the Postgres database, Auth, Storage, and the Studio dashboard) directly on your own computer inside Docker containers.

This creates an isolated sandbox where you can test schema migrations and code changes safely without accidentally breaking or modifying your live remote database (`https://swffrwezqqayucpjtjeq.supabase.co`).

Here is the step-by-step guide to setting up a local Supabase database for your project:

### Step 1: Install and Run Docker

Supabase uses Docker to run its various database services locally.

* Download and install **Docker Desktop** for your operating system (Windows, Mac, or Linux).
* Make sure the Docker Desktop application is open and running in the background before moving to the next step.

### Step 2: Install the Supabase CLI

You need the Supabase Command Line Interface (CLI) to manage your local environment. Open your terminal and install it using the package manager that matches your setup:

* **Using npm (Node.js):**
```bash
npm install supabase --save-dev

```


* **Using Homebrew (macOS):**
```bash
brew install supabase/tap/supabase

```


* **Using Scoop (Windows):**
```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

```



### Step 3: Initialize Supabase in Your Project

Navigate to the root directory of your project in your terminal and run:

```bash
supabase init

```

This command creates a new `supabase` directory in your project containing configuration settings and a folder for your migration scripts.

### Step 4: Link to Your Remote Supabase Project (Optional but Recommended)

To sync your local environment with your existing remote project, link them using your Project Reference ID (the string of letters and numbers in your URL, which is `swffrwezqqayucpjtjeq`):

```bash
supabase link --project-ref swffrwezqqayucpjtjeq

```

*Note: It will prompt you to enter your database password (the master password you created when you first created the project on Supabase).*

If you want to pull down the current schema of your remote database into your local setup, run:

```bash
supabase db pull

```

### Step 5: Start Your Local Supabase DB

Now, start the local database stack by running:

```bash
supabase start

```

The first time you run this, it will take a few minutes to download the necessary Docker images. Once it finishes, it will print a list of local credentials and URLs in your terminal, including:

* **Studio URL:** `http://localhost:54321` (A local version of the Supabase dashboard where you can view tables)
* **API URL:** `http://localhost:54321`
* **anon key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Step 6: Update Your Local Environment Variables

To make your local frontend connect to your new local database instead of the remote live database, change the variables in your local environment file (e.g., `.env.local`):

```env
# Switch from remote to local URLs
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_local_anon_key_from_the_terminal_output

```

Whenever you want to stop the local database to save computer resources, you can run `supabase stop`. When you want to work again, just run `supabase start`.

When you start Supabase, it will run following containers

CONTAINER ID   IMAGE                                                   COMMAND                   CREATED              STATUS                        PORTS                                                                              NAMES
2695f05ee237   public.ecr.aws/supabase/studio:2026.06.08-sha-8af2bb0   "docker-entrypoint.s…"    About a minute ago   Up About a minute (healthy)   0.0.0.0:54323->3000/tcp, [::]:54323->3000/tcp                                      supabase_studio_flash-card
9ff2ee850749   public.ecr.aws/supabase/postgres-meta:v0.96.6           "docker-entrypoint.s…"    About a minute ago   Up About a minute (healthy)   8080/tcp                                                                           supabase_pg_meta_flash-card
f0463e005657   public.ecr.aws/supabase/edge-runtime:v1.74.1            "sh -c 'cat <<'EOF' …"    About a minute ago   Up About a minute             8081/tcp                                                                           supabase_edge_runtime_flash-card
ded7ab0c08ad   public.ecr.aws/supabase/storage-api:v1.60.10            "docker-entrypoint.s…"    About a minute ago   Up About a minute (healthy)   5000/tcp                                                                           supabase_storage_flash-card
1aa0219fc598   public.ecr.aws/supabase/postgrest:v14.5                 "postgrest"               About a minute ago   Up About a minute             3000/tcp                                                                           supabase_rest_flash-card
dd26dd9dd5c3   public.ecr.aws/supabase/realtime:v2.106.0               "/usr/bin/tini -s -g…"    About a minute ago   Up About a minute (healthy)   4000/tcp                                                                           supabase_realtime_flash-card
73c1bdbf6355   public.ecr.aws/supabase/mailpit:v1.22.3                 "/mailpit"                About a minute ago   Up About a minute (healthy)   1025/tcp, 1110/tcp, 0.0.0.0:54324->8025/tcp, [::]:54324->8025/tcp                  supabase_inbucket_flash-card
0dd077f6c658   public.ecr.aws/supabase/gotrue:v2.189.0                 "auth"                    About a minute ago   Up About a minute (healthy)   9999/tcp                                                                           supabase_auth_flash-card
fa2c42cc36b6   public.ecr.aws/supabase/kong:2.8.1                      "sh -c 'cat <<'EOF' …"    About a minute ago   Up About a minute (healthy)   8001/tcp, 8088/tcp, 8443-8444/tcp, 0.0.0.0:54321->8000/tcp, [::]:54321->8000/tcp   supabase_kong_flash-card
8f761614a1f7   public.ecr.aws/supabase/postgres:17.6.1.121             "sh -c '\ncat <<'EOF'…"   2 minutes ago        Up 2 minutes (healthy)        0.0.0.0:54322->5432/tcp, [::]:54322->5432/tcp                                      supabase_db_flash-card

You can open your browser and navigate to http://localhost:54321 to access the local Supabase Studio Dashboard. If you click on the Table Editor, you should see your fc_flashcards table exactly as it exists on your remote database.