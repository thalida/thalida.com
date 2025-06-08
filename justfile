set positional-arguments
set dotenv-load


project_dir := justfile_dir()


default:
  just --list

django-admin *args='':
  cd "{{ project_dir }}"; infisical run --env=dev  -- uv run django-admin $@;

manage *args='':
  cd "{{ project_dir }}"; infisical run --env=dev  -- uv run manage.py $@;

uv *args='':
  cd "{{ project_dir }}"; infisical run --env=dev  -- uv $@;

start-services:
  cd "{{ project_dir }}"; infisical run --env=dev -- docker compose up --detach --no-recreate; docker compose logs -f;

stop-services:
  cd "{{ project_dir }}"; infisical run --env=dev -- docker compose down;

start:
  cd "{{ project_dir }}"; infisical run --env=dev  -- uv run manage.py runserver

collectstatic:
   cd "{{ project_dir }}"; infisical run --env=dev -- uv run python manage.py collectstatic --noinput

infisical-login:
  cd "{{ project_dir }}"; infisical login

init:
  cd "{{ project_dir }}"; infisical run --env=dev -- uv sync --locked
  cd "{{ project_dir }}"; infisical run --env=dev -- pre-commit install
  cd "{{ project_dir }}"; infisical run --env=dev -- uv run manage.py migrate
