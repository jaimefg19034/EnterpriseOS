# Strategic AI advisor setup

The workspace ships with a local, deterministic recommendation engine. To enable generative recommendations, configure the Supabase Edge Function:

1. In the GitHub repository, add the Actions secret `SUPABASE_ACCESS_TOKEN`.
2. Add the Actions variable `SUPABASE_PROJECT_REF` with the Supabase project reference.
3. Add the Actions secret `OPENAI_API_KEY`.
4. Optionally add the Actions variable `OPENAI_MODEL` (defaults to `gpt-4o-mini`).
5. Ensure the existing Pages build has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` configured.

The `Deploy strategic advisor function` workflow deploys the Edge Function and sets the OpenAI key as a Supabase secret. The key is never shipped to the browser. If these values are absent, the workspace remains usable with local analysis and explicitly labels that mode.

The copilot analyses the current P&L model and saved operational records. It does not connect to bank feeds or accounting systems automatically. Savings and investment impacts are scenario estimates, not guarantees or regulated advice.
