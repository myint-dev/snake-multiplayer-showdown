<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

# Backend & Environment Setup

## Dependency Management (`uv`)

For backend tasks, always use `uv` instead of standard `pip`. Never create a `requirements.txt` file.

Useful commands:

- `uv sync` — Install project dependencies
- `uv add <PACKAGE-NAME>` — Add a new library
- `uv run python <PYTHON-FILE>` — Execute scripts within the virtual environment

## Git Best Practices

- Regularly commit clean, working code to git.
