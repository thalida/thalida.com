---
title: "Knowledge Base: Django Generic Fields"
description: Guidelines and Answers to all things Django Generic Fields
publishedOn: 2023-11-13T21:47:00Z
updatedOn: 2023-11-14T02:33:00Z
coverImage: knowledge-base-django-generic-fields/Screenshot 2025-07-02 at 17.43.24.png
coverImageAlt: "Django Generic Fields"
tags:
  - Knowledge Base
  - Django
  - Django Rest Framework
category: django
---

## How To…


### Create a Generic Field

```python
from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType

class Message(models.Model):
  author_content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    author_object_id = models.UUIDField()
    author = GenericForeignKey(
        "author_content_type",
        "author_object_id"
    )
   ...
```


### Limit a Generic Field to specific models

```python
from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType

class Message(models.Model):
  author_content_type = models.ForeignKey(
       ContentType,
       on_delete=models.CASCADE,
       related_name="messages",
    **limit_choices_to={
           "model__in": [
               "agent",
               "customer"
           ]
       }**
   )
   author_object_id = models.UUIDField()
   author = GenericForeignKey(
       "author_content_type",
       "author_object_id"
   )

  class Meta:
        indexes = [
            models.Index(fields=["author_content_type", "author_object_id"]),
        ]
```


### DRF ModelViewSet Create with Generic Field

```python
from django.contrib.contenttypes.models import ContentType
from rest_framework import viewset
from rest_framework.permissions import IsAuthenticated

from .models import Message
from .serializers import MessageSerializer

class MessageViewSet(viewsets.ModelViewSet):
    model = Message
    serializer_class = MessageSerializer
  permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
    author = request.user
        request.data['author_content_type'] = ContentType.objects.get_for_model(author).id
        request.data['author_object_id'] = request.user.id

        return super().create(request, *args, **kwargs)
```
