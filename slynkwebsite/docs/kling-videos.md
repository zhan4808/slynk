# Kling AI Video Generation

This document describes the workflow for generating product videos using the Kling AI API.

## Overview

The product video generation process consists of the following steps:

1. User uploads a product image and provides a product description
2. The system generates multiple scene descriptions using OpenAI
3. For each scene, a video generation task is created with Kling AI
4. The system polls Kling's API to check task status until videos are ready
5. Videos are stored and associated with the persona in the database

## Components

### 1. Authentication

Authentication with Kling API is handled by the `kling-auth.ts` utility:

- Generates JWT tokens for API authentication
- Caches tokens to minimize API requests
- Manages token expiration and refresh

### 2. Scene Generation

Scene prompts are generated using OpenAI through the `/api/ai/generate-scenes` endpoint:

- Takes product name and description as input
- Returns 3 different scene concepts with titles, descriptions, and prompts
- Falls back to default scenes if OpenAI call fails

### 3. Video Generation

Video generation is managed by the `kling-api.ts` utility:

- Creates video generation tasks with Kling API
- Polls for task status and retrieves video URLs when complete
- Handles error cases with appropriate fallbacks

### 4. User Interface

The `ProductVideoManager` component provides the UI for:

- Uploading product images
- Entering product descriptions
- Initiating video generation
- Displaying generated videos
- Managing existing videos

## Database Schema

Videos are stored in the `ProductVideo` model with these fields:

- `id`: Unique identifier
- `personaId`: Associated persona
- `title`: Scene title
- `description`: Scene description
- `prompt`: Generation prompt used
- `url`: Video URL
- `thumbnailUrl`: Thumbnail image URL
- `taskId`: Kling API task ID
- `status`: Generation status (pending, complete, failed)
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

## Error Handling

The system includes robust error handling:

- API credential verification and validation
- Fallback scenes if OpenAI generation fails
- Task status monitoring with retry mechanisms
- Database transaction protection for data integrity

## Configuration

Required environment variables:

```
KLING_API_KEY=your_kling_access_key
KLING_API_SECRET=your_kling_secret_key
OPENAI_API_KEY=your_openai_api_key
```

## Monitoring

To check the status of Kling API:

```
npm run check-kling
```

This will verify API credentials and connectivity. 