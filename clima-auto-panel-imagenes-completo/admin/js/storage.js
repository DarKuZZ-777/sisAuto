(function () {
  const BUCKET = "SIS_AUTO";
  const MAX_BYTES = 5 * 1024 * 1024;
  const TIPOS = new Set(["image/jpeg", "image/png", "image/webp"]);

  function extensionDeArchivo(archivo) {
    const porNombre = archivo.name?.split(".").pop()?.toLowerCase();
    if (porNombre && ["jpg", "jpeg", "png", "webp"].includes(porNombre)) {
      return porNombre === "jpeg" ? "jpg" : porNombre;
    }
    return ({
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp"
    })[archivo.type] || "jpg";
  }

  function validarImagen(archivo) {
    if (!archivo) throw new Error("Seleccioná una imagen.");
    if (!TIPOS.has(archivo.type)) {
      throw new Error("Formato no permitido. Usá JPG, PNG o WebP.");
    }
    if (archivo.size > MAX_BYTES) {
      throw new Error("La imagen supera el máximo permitido de 5 MB.");
    }
    return true;
  }

  function generarNombreArchivo(archivo, prefijo = "imagen") {
    const extension = extensionDeArchivo(archivo);
    const identificador = crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return `${prefijo}-${identificador}.${extension}`;
  }

  async function subirImagen(archivo, prefijo = "imagen") {
    validarImagen(archivo);
    const ruta = generarNombreArchivo(archivo, prefijo);
    const { error } = await window.supabaseClient.storage
      .from(BUCKET)
      .upload(ruta, archivo, {
        cacheControl: "3600",
        contentType: archivo.type,
        upsert: false
      });

    if (error) throw new Error(`No se pudo subir la imagen: ${error.message}`);

    const { data } = window.supabaseClient.storage.from(BUCKET).getPublicUrl(ruta);
    if (!data?.publicUrl) {
      await eliminarImagen(ruta).catch(() => {});
      throw new Error("Supabase no devolvió la URL pública de la imagen.");
    }

    return { imagen_url: data.publicUrl, ruta_storage: ruta };
  }

  async function eliminarImagen(ruta) {
    if (!ruta) return;
    const { error } = await window.supabaseClient.storage.from(BUCKET).remove([ruta]);
    if (error) throw new Error(`No se pudo eliminar la imagen: ${error.message}`);
  }

  window.ClimaAutoStorage = Object.freeze({
    BUCKET,
    MAX_BYTES,
    validarImagen,
    subirImagen,
    eliminarImagen
  });
})();
