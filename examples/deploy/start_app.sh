#!/bin/sh

# paths
app_dir='/opt/Telemeta/'
sandbox_dir='/home/telemeta/'
manage=$sandbox_dir'manage.py'
wsgi=$sandbox_dir'wsgi.py'
app_static_dir=$app_dir'telemeta/static/'

# django init
python $manage syncdb --noinput
python $manage migrate --noinput
python $manage collectstatic --noinput
python $manage telemeta-create-admin-user

# static files auto update
pip install watchdog

watchmedo shell-command --patterns="*.js;*.css" --recursive \
    --command='python '$manage' collectstatic --noinput' $app_static_dir &

# app start
uwsgi --socket :8000 --wsgi-file $wsgi --chdir $sandbox_dir --master --processes 4 --threads 2 --py-autoreload 3
