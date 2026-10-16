FROM node:20-alpine AS base

# Directorio de trabajo
WORKDIR /app

# Instalar dependencias necesarias para node-gyp / libc si corresponde
RUN apk add --no-cache libc6-compat

# Copiar manifiestos de paquetes
COPY package.json package-lock.json* ./

# Instalar dependencias
RUN npm install

# Copiar el código fuente
COPY . .

# Exponer el puerto de desarrollo de Next.js
EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Ejecutar en modo desarrollo con Hot-Reloading
CMD ["npm", "run", "dev"]
