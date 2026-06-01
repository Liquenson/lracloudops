import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    titulo: z.string(),
    descripcion: z.string(),
    fecha: z.coerce.date(),
    tags: z.array(z.string()),
    draft: z.boolean().default(false),
  }),
})

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    titulo: z.string(),
    descripcion: z.string(),
    fecha: z.coerce.date(),
    categoria: z.string(),
    madurez: z.enum(['Production', 'In Development', 'Reference', 'Starter']),
    stack: z.array(z.string()),
    cicd: z.boolean().default(false),
    github: z.string().nullable().optional(),
    featured: z.boolean().default(false),
    iconPath: z.string().optional(),
    draft: z.boolean().default(false),
    metricas: z.array(z.object({
      label: z.string(),
      value: z.string(),
    })).optional(),
    highlights: z.array(z.string()).optional(),
    arquitectura: z.array(z.object({
      nombre: z.string(),
      descripcion: z.string(),
    })).optional(),
  }),
})

export const collections = { blog, projects }
