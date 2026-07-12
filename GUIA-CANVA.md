# Flujo con Canva Bulk Create

Este es el camino elegido: el sistema es la **fuente de verdad** (registro en Supabase,
numeración `GBC-26X-0001`, páginas de verificación y QR), y **Canva** arma el PDF final
manteniendo tu diseño y fuentes exactos.

## El circuito completo

```
1. Cargás los graduados (XLS o formulario)  ->  Supabase
2. El sistema genera número, página de verificación y QR de cada uno
3. Descargás el "CSV para Canva" desde el panel admin
4. Canva Bulk Create rellena el diseño (nombre, número, fecha, estado, QR)
5. Descargás todos los PDF y los enviás
```

## Preparar el diseño en Canva (una sola vez)

1. Abrí tu certificado en Canva.
2. Dejá un **recuadro para el QR arriba de la firma de Santo González** (esa es la
   posición que acordamos; en el preview se ve el tamaño y lugar exactos).
   Poné ahí una imagen cualquiera de placeholder (después Bulk Create la reemplaza).
3. Identificá los textos variables que va a rellenar Canva:
   - **Nombre Completo**
   - **Número de certificado** (GBC-26G-0001)
   - **Fecha de finalización**
   - **Estado** (Activo y válido)

## Conectar los datos (Bulk Create)

1. En Canva, panel izquierdo → **Apps** → **Bulk Create** (Crear en lote).
2. **Upload CSV** y subí el archivo `canva-bulk-create.csv` que descargaste del panel admin.
   Las columnas son: `Nombre Completo, Número de certificado, Fecha de finalización, Estado, QR`.
3. Para cada texto del diseño: click derecho → **Connect data** → elegí la columna que corresponde.
4. Para el **QR**: click derecho en la imagen placeholder → **Connect data** → columna `QR`.
   (La columna QR trae la URL de la imagen; Canva la descarga sola para cada persona.)
5. **Continue → Generate**. Canva crea una página por graduado con todo relleno.
6. **Download → PDF**. Listo para enviar.

> La columna `QR` apunta a `https://verify.govbidder.net/api/certificates/GBC-XXX/qr`.
> Para que Canva pueda leer esas imágenes, el sistema tiene que estar deployado en Vercel
> con el dominio configurado (ver README).

## Importante sobre el QR

Cada QR lleva a `verify.govbidder.net/certificate/GBC-26X-0001`, que muestra el estado en
vivo desde Supabase. Si más adelante revocás un certificado (status = revoked), el QR sigue
siendo el mismo pero la página de verificación pasa a mostrar "REVOCADO". No hay que
regenerar nada.
