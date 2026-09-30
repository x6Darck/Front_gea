/**
 * Servicio del panel de seguridad (SuperAdmin): historial de inicios de sesión.
 *
 * Espeja el patrón de reportes.service.js / usuarios.service.js. El interceptor
 * de `api` ya desenvuelve el wrapper `ApiResponse<T>` del backend, por lo que las
 * funciones de este servicio reciben directamente el payload (`data`), sin
 * necesidad de acceder a `res.data.data`.
 */
import api from './api';

/**
 * Obtiene el historial paginado de inicios de sesión, con filtros opcionales.
 * Solo accesible para SUPER_ADMIN (el backend valida el rol).
 * @param {Object} [filtros={}] - { correo, ip, exito, desde, hasta, page, size }
 * @returns {Promise<Object>} Page: { content, totalElements, totalPages, number, size }
 */
export const getHistorialLogin = async (filtros = {}) => {
  const params = {};
  if (filtros.correo) params.correo = filtros.correo;
  if (filtros.ip) params.ip = filtros.ip;
  if (filtros.exito !== undefined && filtros.exito !== '') params.exito = filtros.exito;
  if (filtros.desde) params.desde = filtros.desde;
  if (filtros.hasta) params.hasta = filtros.hasta;
  params.page = filtros.page ?? 0;
  params.size = filtros.size ?? 25;

  return await api.get('/admin/seguridad/historial-login', { params });
};
