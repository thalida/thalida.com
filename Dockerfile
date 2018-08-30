FROM httpd:alpine

COPY app/ /usr/local/apache2/htdocs/
