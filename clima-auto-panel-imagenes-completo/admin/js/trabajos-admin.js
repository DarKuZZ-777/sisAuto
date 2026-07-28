(function () {
  let trabajoEditando = null;
  let imagenActual = { imagen_url: null, ruta_storage: null };
  let urlPreviewTemporal = null;

  const $ = (id) => document.getElementById(id);
  const escapar = (valor) => String(valor ?? "").replace(/[&<>"']/g, (caracter) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[caracter]);

  function archivoSeleccionado() {
    return $("trabajo-imagen-archivo")?.files?.[0] || null;
  }

  function liberarPreviewTemporal() {
    if (urlPreviewTemporal) URL.revokeObjectURL(urlPreviewTemporal);
    urlPreviewTemporal = null;
  }

  function mostrarPreview(url) {
    const contenedor = $("trabajo-imagen-preview-contenedor");
    const imagen = $("trabajo-imagen-preview");
    const vacio = $("trabajo-imagen-sin-preview");
    if (!contenedor || !imagen || !vacio) return;

    if (url) {
      imagen.src = url;
      imagen.hidden = false;
      vacio.hidden = true;
      contenedor.classList.add("con-imagen");
    } else {
      imagen.removeAttribute("src");
      imagen.hidden = true;
      vacio.hidden = false;
      contenedor.classList.remove("con-imagen");
    }
  }

  function actualizarPreviewDesdeArchivo() {
    liberarPreviewTemporal();
    const archivo = archivoSeleccionado();
    if (!archivo) {
      mostrarPreview(imagenActual.imagen_url);
      return;
    }

    try {
      window.ClimaAutoStorage.validarImagen(archivo);
      urlPreviewTemporal = URL.createObjectURL(archivo);
      mostrarPreview(urlPreviewTemporal);
      $("trabajo-imagen-ayuda").textContent = `${archivo.name} · ${(archivo.size / 1024 / 1024).toFixed(2)} MB`;
    } catch (error) {
      $("trabajo-imagen-archivo").value = "";
      mostrarPreview(imagenActual.imagen_url);
      window.mostrarMensajePanel(error.message);
    }
  }

  function datosFormulario() {
    return {
      titulo: $("trabajo-titulo").value.trim(),
      vehiculo: $("trabajo-vehiculo").value.trim() || null,
      anio_vehiculo: $("trabajo-anio").value ? Number($("trabajo-anio").value) : null,
      problema: $("trabajo-problema").value.trim() || null,
      trabajo_realizado: $("trabajo-realizado").value.trim() || null,
      resultado: $("trabajo-resultado").value.trim() || null,
      fecha_trabajo: $("trabajo-fecha").value || null,
      visible: $("trabajo-visible").checked,
      destacado: $("trabajo-destacado").checked,
      orden: Number($("trabajo-orden").value) || 0,
      updated_at: new Date().toISOString()
    };
  }

  function establecerGuardando(guardando) {
    const boton = $("boton-guardar-trabajo");
    const texto = $("texto-boton-trabajo");
    if (boton) boton.disabled = guardando;
    if (texto) texto.textContent = guardando
      ? "Guardando..."
      : trabajoEditando ? "Guardar cambios" : "Crear trabajo";
  }

  function limpiarFormulario() {
    liberarPreviewTemporal();
    $("form-trabajo").reset();
    $("trabajo-visible").checked = true;
    $("trabajo-orden").value = 0;
    $("trabajo-imagen-ayuda").textContent = "JPG, PNG o WebP. Máximo 5 MB.";
    trabajoEditando = null;
    imagenActual = { imagen_url: null, ruta_storage: null };
    mostrarPreview(null);
    $("titulo-form-trabajo").textContent = "Nuevo trabajo";
    $("texto-boton-trabajo").textContent = "Crear trabajo";
    $("boton-cancelar-trabajo").hidden = true;
  }

  async function guardarTrabajo(evento) {
    evento.preventDefault();
    const datos = datosFormulario();
    const archivo = archivoSeleccionado();

    if (!datos.titulo) {
      window.mostrarMensajePanel("El título es obligatorio.");
      return;
    }

    let imagenNueva = null;
    establecerGuardando(true);
    try {
      if (archivo) imagenNueva = await window.ClimaAutoStorage.subirImagen(archivo, "trabajo");

      const payload = {
        ...datos,
        imagen_principal_url: imagenNueva?.imagen_url ?? imagenActual.imagen_url,
        ruta_storage: imagenNueva?.ruta_storage ?? imagenActual.ruta_storage
      };

      const consulta = trabajoEditando
        ? window.supabaseClient.from("trabajos").update(payload).eq("id", trabajoEditando)
        : window.supabaseClient.from("trabajos").insert(payload);

      const { error } = await consulta;
      if (error) throw error;

      if (imagenNueva && imagenActual.ruta_storage && imagenActual.ruta_storage !== imagenNueva.ruta_storage) {
        await window.ClimaAutoStorage.eliminarImagen(imagenActual.ruta_storage).catch((e) => console.warn(e.message));
      }

      limpiarFormulario();
      await window.cargarTrabajosAdmin();
      await window.cargarResumenPanel();
      window.mostrarMensajePanel("Trabajo guardado correctamente.", "exito");
    } catch (error) {
      if (imagenNueva?.ruta_storage) {
        await window.ClimaAutoStorage.eliminarImagen(imagenNueva.ruta_storage).catch(() => {});
      }
      window.mostrarMensajePanel(error.message || "No se pudo guardar el trabajo.");
    } finally {
      establecerGuardando(false);
    }
  }

  async function editarTrabajo(id) {
    const { data, error } = await window.supabaseClient.from("trabajos").select("*").eq("id", id).single();
    if (error) return window.mostrarMensajePanel(error.message);

    trabajoEditando = id;
    imagenActual = {
      imagen_url: data.imagen_principal_url || null,
      ruta_storage: data.ruta_storage || null
    };

    $("trabajo-titulo").value = data.titulo || "";
    $("trabajo-vehiculo").value = data.vehiculo || "";
    $("trabajo-anio").value = data.anio_vehiculo ?? "";
    $("trabajo-problema").value = data.problema || "";
    $("trabajo-realizado").value = data.trabajo_realizado || "";
    $("trabajo-resultado").value = data.resultado || "";
    $("trabajo-fecha").value = data.fecha_trabajo || "";
    $("trabajo-visible").checked = Boolean(data.visible);
    $("trabajo-destacado").checked = Boolean(data.destacado);
    $("trabajo-orden").value = data.orden || 0;
    $("trabajo-imagen-archivo").value = "";
    $("trabajo-imagen-ayuda").textContent = "Seleccioná otra imagen solo para reemplazar la actual.";
    mostrarPreview(imagenActual.imagen_url);
    $("titulo-form-trabajo").textContent = "Editar trabajo";
    $("texto-boton-trabajo").textContent = "Guardar cambios";
    $("boton-cancelar-trabajo").hidden = false;
    $("form-trabajo").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function alternarVisibilidad(id, visibleActual) {
    const { error } = await window.supabaseClient.from("trabajos").update({
      visible: !visibleActual,
      updated_at: new Date().toISOString()
    }).eq("id", id);
    if (error) return window.mostrarMensajePanel(error.message);
    await window.cargarTrabajosAdmin();
    await window.cargarResumenPanel();
  }

  async function eliminarTrabajo(id) {
    if (!confirm("¿Eliminar este trabajo y su imagen principal?")) return;

    const { data, error: lecturaError } = await window.supabaseClient
      .from("trabajos")
      .select("ruta_storage")
      .eq("id", id)
      .single();
    if (lecturaError) return window.mostrarMensajePanel(lecturaError.message);

    const { error } = await window.supabaseClient.from("trabajos").delete().eq("id", id);
    if (error) return window.mostrarMensajePanel(error.message);

    if (data?.ruta_storage) {
      await window.ClimaAutoStorage.eliminarImagen(data.ruta_storage).catch((errorStorage) => {
        console.warn(errorStorage.message);
        window.mostrarMensajePanel("Trabajo eliminado. No fue posible borrar su imagen anterior del Storage.");
      });
    }

    if (String(trabajoEditando) === String(id)) limpiarFormulario();
    await window.cargarTrabajosAdmin();
    await window.cargarResumenPanel();
    window.mostrarMensajePanel("Trabajo eliminado.", "exito");
  }

  window.cargarTrabajosAdmin = async function () {
    const { data, error } = await window.supabaseClient.from("trabajos").select("*").order("orden");
    if (error) {
      window.mostrarMensajePanel(error.message);
      return;
    }

    $("contador-trabajos-admin").textContent = `${data.length} trabajos`;
    $("estado-vacio-trabajos").hidden = data.length > 0;
    $("lista-trabajos-admin").innerHTML = data.map((trabajo) => `
      <article class="tarjeta-servicio-admin">
        <img src="${escapar(trabajo.imagen_principal_url || "https://placehold.co/300x200?text=Trabajo")}" alt="${escapar(trabajo.titulo)}">
        <div>
          <h3>${escapar(trabajo.titulo)}</h3>
          <p>${escapar([trabajo.vehiculo, trabajo.anio_vehiculo].filter(Boolean).join(" · ") || "Sin vehículo")}</p>
          <small>${trabajo.visible ? "Visible" : "Oculto"} · Orden ${trabajo.orden || 0}</small>
          <div class="servicio-admin-acciones">
            <button data-a="editar" data-id="${trabajo.id}">Editar</button>
            <button data-a="visibilidad" data-id="${trabajo.id}" data-v="${trabajo.visible}">${trabajo.visible ? "Ocultar" : "Publicar"}</button>
            <button class="boton-eliminar-admin" data-a="eliminar" data-id="${trabajo.id}">Eliminar</button>
          </div>
        </div>
      </article>`).join("");
  };

  document.addEventListener("DOMContentLoaded", () => {
    $("form-trabajo")?.addEventListener("submit", guardarTrabajo);
    $("trabajo-imagen-archivo")?.addEventListener("change", actualizarPreviewDesdeArchivo);
    $("boton-cancelar-trabajo")?.addEventListener("click", limpiarFormulario);
    $("boton-recargar-trabajos")?.addEventListener("click", window.cargarTrabajosAdmin);
    $("lista-trabajos-admin")?.addEventListener("click", async (evento) => {
      const boton = evento.target.closest("button[data-a]");
      if (!boton) return;
      const id = boton.dataset.id;
      if (boton.dataset.a === "editar") await editarTrabajo(id);
      if (boton.dataset.a === "visibilidad") await alternarVisibilidad(id, boton.dataset.v === "true");
      if (boton.dataset.a === "eliminar") await eliminarTrabajo(id);
    });
  });
})();
