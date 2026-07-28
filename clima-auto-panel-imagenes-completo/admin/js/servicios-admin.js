(function () {
  let servicioEditando = null;
  let imagenActual = { imagen_url: null, ruta_storage: null };
  let urlPreviewTemporal = null;

  const $ = (id) => document.getElementById(id);
  const escapar = (valor) => String(valor ?? "").replace(/[&<>"']/g, (caracter) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[caracter]);

  function archivoSeleccionado() {
    return $("servicio-imagen-archivo")?.files?.[0] || null;
  }

  function liberarPreviewTemporal() {
    if (urlPreviewTemporal) URL.revokeObjectURL(urlPreviewTemporal);
    urlPreviewTemporal = null;
  }

  function mostrarPreview(url) {
    const contenedor = $("servicio-imagen-preview-contenedor");
    const imagen = $("servicio-imagen-preview");
    const vacio = $("servicio-imagen-sin-preview");
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
      $("servicio-imagen-ayuda").textContent = `${archivo.name} · ${(archivo.size / 1024 / 1024).toFixed(2)} MB`;
    } catch (error) {
      $("servicio-imagen-archivo").value = "";
      mostrarPreview(imagenActual.imagen_url);
      window.mostrarMensajePanel(error.message);
    }
  }

  function datosFormulario() {
    return {
      nombre: $("servicio-nombre").value.trim(),
      descripcion: $("servicio-descripcion").value.trim() || null,
      precio_desde: $("servicio-precio-desde").value ? Number($("servicio-precio-desde").value) : null,
      mostrar_precio: $("servicio-mostrar-precio").checked,
      visible: $("servicio-visible").checked,
      destacado: $("servicio-destacado").checked,
      orden: Number($("servicio-orden").value) || 0,
      updated_at: new Date().toISOString()
    };
  }

  function establecerGuardando(guardando) {
    const boton = $("boton-guardar-servicio");
    const texto = $("texto-boton-servicio");
    if (boton) boton.disabled = guardando;
    if (texto) texto.textContent = guardando
      ? "Guardando..."
      : servicioEditando ? "Guardar cambios" : "Crear servicio";
  }

  function limpiarFormulario() {
    liberarPreviewTemporal();
    $("form-servicio").reset();
    $("servicio-visible").checked = true;
    $("servicio-orden").value = 0;
    $("servicio-imagen-ayuda").textContent = "JPG, PNG o WebP. Máximo 5 MB.";
    servicioEditando = null;
    imagenActual = { imagen_url: null, ruta_storage: null };
    mostrarPreview(null);
    $("titulo-form-servicio").textContent = "Nuevo servicio";
    $("texto-boton-servicio").textContent = "Crear servicio";
    $("boton-cancelar-servicio").hidden = true;
  }

  async function guardarServicio(evento) {
    evento.preventDefault();
    const datos = datosFormulario();
    const archivo = archivoSeleccionado();

    if (!datos.nombre) {
      window.mostrarMensajePanel("El nombre es obligatorio.");
      return;
    }
    if (!servicioEditando && !archivo) {
      window.mostrarMensajePanel("Seleccioná una imagen para el servicio.");
      return;
    }

    let imagenNueva = null;
    establecerGuardando(true);

    try {
      if (archivo) imagenNueva = await window.ClimaAutoStorage.subirImagen(archivo, "servicio");

      const payload = {
        ...datos,
        imagen_url: imagenNueva?.imagen_url ?? imagenActual.imagen_url,
        ruta_storage: imagenNueva?.ruta_storage ?? imagenActual.ruta_storage
      };

      const consulta = servicioEditando
        ? window.supabaseClient.from("servicios").update(payload).eq("id", servicioEditando)
        : window.supabaseClient.from("servicios").insert(payload);

      const { error } = await consulta;
      if (error) throw error;

      if (imagenNueva && imagenActual.ruta_storage && imagenActual.ruta_storage !== imagenNueva.ruta_storage) {
        await window.ClimaAutoStorage.eliminarImagen(imagenActual.ruta_storage).catch((error) => console.warn(error.message));
      }

      limpiarFormulario();
      await window.cargarServiciosAdmin();
      await window.cargarResumenPanel();
      window.mostrarMensajePanel("Servicio guardado correctamente.", "exito");
    } catch (error) {
      if (imagenNueva?.ruta_storage) {
        await window.ClimaAutoStorage.eliminarImagen(imagenNueva.ruta_storage).catch(() => {});
      }
      window.mostrarMensajePanel(error.message || "No se pudo guardar el servicio.");
    } finally {
      establecerGuardando(false);
    }
  }

  async function editarServicio(id) {
    const { data, error } = await window.supabaseClient.from("servicios").select("*").eq("id", id).single();
    if (error) return window.mostrarMensajePanel(error.message);

    servicioEditando = id;
    imagenActual = {
      imagen_url: data.imagen_url || null,
      ruta_storage: data.ruta_storage || null
    };
    $("servicio-nombre").value = data.nombre || "";
    $("servicio-descripcion").value = data.descripcion || "";
    $("servicio-precio-desde").value = data.precio_desde ?? "";
    $("servicio-mostrar-precio").checked = Boolean(data.mostrar_precio);
    $("servicio-visible").checked = Boolean(data.visible);
    $("servicio-destacado").checked = Boolean(data.destacado);
    $("servicio-orden").value = data.orden || 0;
    $("servicio-imagen-archivo").value = "";
    $("servicio-imagen-ayuda").textContent = "Seleccioná otra imagen solo para reemplazar la actual.";
    mostrarPreview(imagenActual.imagen_url);
    $("titulo-form-servicio").textContent = "Editar servicio";
    $("texto-boton-servicio").textContent = "Guardar cambios";
    $("boton-cancelar-servicio").hidden = false;
    $("form-servicio").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function alternarVisibilidad(id, visibleActual) {
    const { error } = await window.supabaseClient.from("servicios").update({
      visible: !visibleActual,
      updated_at: new Date().toISOString()
    }).eq("id", id);
    if (error) return window.mostrarMensajePanel(error.message);
    await window.cargarServiciosAdmin();
    await window.cargarResumenPanel();
  }

  async function eliminarServicio(id) {
    if (!confirm("¿Eliminar este servicio y su imagen?")) return;

    const { data, error: lecturaError } = await window.supabaseClient
      .from("servicios")
      .select("ruta_storage")
      .eq("id", id)
      .single();
    if (lecturaError) return window.mostrarMensajePanel(lecturaError.message);

    const { error } = await window.supabaseClient.from("servicios").delete().eq("id", id);
    if (error) return window.mostrarMensajePanel(error.message);

    if (data?.ruta_storage) {
      await window.ClimaAutoStorage.eliminarImagen(data.ruta_storage).catch((errorStorage) => {
        console.warn(errorStorage.message);
        window.mostrarMensajePanel("Servicio eliminado. No fue posible borrar la imagen anterior del Storage.");
      });
    }

    if (String(servicioEditando) === String(id)) limpiarFormulario();
    await window.cargarServiciosAdmin();
    await window.cargarResumenPanel();
    window.mostrarMensajePanel("Servicio eliminado.", "exito");
  }

  window.cargarServiciosAdmin = async function () {
    const { data, error } = await window.supabaseClient.from("servicios").select("*").order("orden");
    if (error) {
      window.mostrarMensajePanel(error.message);
      return;
    }

    $("contador-servicios-admin").textContent = `${data.length} servicios`;
    $("estado-vacio-servicios").hidden = data.length > 0;
    $("lista-servicios-admin").innerHTML = data.map((servicio) => `
      <article class="tarjeta-servicio-admin">
        <img src="${escapar(servicio.imagen_url || "https://placehold.co/300x200?text=Servicio")}" alt="${escapar(servicio.nombre)}">
        <div>
          <h3>${escapar(servicio.nombre)}</h3>
          <p>${escapar(servicio.descripcion || "Sin descripción")}</p>
          <small>${servicio.visible ? "Visible" : "Oculto"} · Orden ${servicio.orden || 0}</small>
          <div class="servicio-admin-acciones">
            <button data-a="editar" data-id="${servicio.id}">Editar</button>
            <button data-a="visibilidad" data-id="${servicio.id}" data-v="${servicio.visible}">${servicio.visible ? "Ocultar" : "Publicar"}</button>
            <button class="boton-eliminar-admin" data-a="eliminar" data-id="${servicio.id}">Eliminar</button>
          </div>
        </div>
      </article>`).join("");
  };

  document.addEventListener("DOMContentLoaded", () => {
    $("form-servicio")?.addEventListener("submit", guardarServicio);
    $("servicio-imagen-archivo")?.addEventListener("change", actualizarPreviewDesdeArchivo);
    $("boton-cancelar-servicio")?.addEventListener("click", limpiarFormulario);
    $("boton-recargar-servicios")?.addEventListener("click", window.cargarServiciosAdmin);
    $("lista-servicios-admin")?.addEventListener("click", async (evento) => {
      const boton = evento.target.closest("button[data-a]");
      if (!boton) return;
      const id = boton.dataset.id;
      if (boton.dataset.a === "editar") await editarServicio(id);
      if (boton.dataset.a === "visibilidad") await alternarVisibilidad(id, boton.dataset.v === "true");
      if (boton.dataset.a === "eliminar") await eliminarServicio(id);
    });
  });
})();
