---
title: "Custom Django Admin: Model Add Template"
description: How to customize Django Admin model templates to add custom content.
publishedOn: 2023-11-11T23:45:00Z
updatedOn: 2023-11-14T02:29:00Z
coverImage: custom-django-admin-add-template/Screenshot 2025-07-02 at 17.42.10.png
coverImageAlt: "Custom Django Admin Add Template"
tags:
- Django
- Django Unfold
---

## Overview

In this post we’ll update the `add_form` template for a model, the same logic can be applied to other admin model templates.

See list of all templates which can be overridden:
[https://docs.djangoproject.com/en/4.2/ref/contrib/admin/#templates-which-may-be-overridden-per-app-or-model](https://docs.djangoproject.com/en/4.2/ref/contrib/admin/#templates-which-may-be-overridden-per-app-or-model)

---


## Create Template File

In your project directory, create a file at this path: `templates/admin/<app_name>/<model>/add_form.html`

For example, if you have an app named `books` and a model named `author`, the path would be: `templates/admin/books/author/add_form.html`


## Extend Template

Extend the base admin change_form template, instead of writing an entirely new template.

```html
{% extends "admin/change_form.html" %}

{% load i18n %}
```

If you’re using [unfold](https://unfoldadmin.com/), update load tag to be `{% load i18n **unflold** %}`

Next modify specific blocks in the template, for example:

```html
{% extends "admin/change_form.html" %}

{% load i18n unfold %}

{% block field_sets %}
**<p>Hello World!</p>**
{{ block.super }}
{% endblock %}
```


## Update Admin Model Class

Update your model’s admin class to load the new add_form template.

```python
@admin.register(MyModel)
class MyModelAdmin(ModelAdmin):
...
    add_form_template = "admin/<project>/<model>/add_form.html"
...
```

When you go to add a new model you should see “Hello World!” above the fields.
