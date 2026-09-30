/**
 * Panel de seguridad (solo SuperAdmin): historial de inicios de sesión al
 * sistema, con filtros (correo, IP, éxito/fallido, rango de fechas) y paginación
 * en servidor. Reutiliza el patrón visual de la página de Reportes.
 *
 * El debounce de 500ms en los campos de correo e IP evita una petición por
 * cada tecla pulsada (mismo patrón que Users.jsx). El select de éxito/fallido
 * y los date pickers no lo necesitan: disparan en eventos discretos, no por
 * cada tecla.
 */
import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Shield, Search, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './SecurityPanel.module.css';
import { getHistorialLogin } from '../services/seguridad.service';
import Spinner from '../components/ui/Spinner';
import { AuthContext } from '../context/AuthContext';

const METODO_LABEL = { LOCAL: 'Correo', MICROSOFT: 'Microsoft' };
const MOTIVO_LABEL = {
  CORREO_NO_REGISTRADO: 'Correo no registrado',
  CUENTA_INACTIVA: 'Cuenta inactiva',
  CREDENCIALES_INVALIDAS: 'Contraseña incorrecta',
  TOKEN_INVALIDO: 'Token inválido',
  OTRO: 'Otro',
};

const SecurityPanel = () => {
  const { user } = useContext(AuthContext);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [correo, setCorreo] = useState('');
  const [ip, setIp] = useState('');
  const [exito, setExito] = useState(''); // '', 'true', 'false'
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const [debouncedCorreo, setDebouncedCorreo] = useState('');
  const [debouncedIp, setDebouncedIp] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCorreo(correo);
    }, 500);
    return () => clearTimeout(timer);
  }, [correo]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedIp(ip);
    }, 500);
    return () => clearTimeout(timer);
  }, [ip]);

  const fetchData = useCallback(async (targetPage = 0) => {
    try {
      setLoading(true);
      const data = await getHistorialLogin({ correo: debouncedCorreo, ip: debouncedIp, exito, desde, hasta, page: targetPage, size: 25 });
      setRows(Array.isArray(data?.content) ? data.content : []);
      setTotalPages(data?.totalPages ?? 0);
      setTotalElements(data?.totalElements ?? 0);
      setPage(data?.number ?? targetPage);
    } catch (e) {
      console.error('Error cargando historial de login:', e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedCorreo, debouncedIp, exito, desde, hasta]);

  useEffect(() => { fetchData(0); }, [fetchData]);

  if (!user) return <Spinner message="Cargando perfil..." />;

  const fmtFecha = (f) => f ? new Date(f).toLocaleString('es-CO') : '—';

  return (
    <div className="page-container">
      <div className={styles.header}>
        <h1 className="page-title" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Shield size={24} color="var(--primary)" /> Panel de Seguridad
        </h1>
      </div>

      <div className="card">
        {/* Barra de filtros (mismo patrón que Reportes) */}
        <div className={styles.filterToolbar}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Filtrar por correo..."
              value={correo}
              onChange={e => setCorreo(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <div className={styles.filterRow}>
            <input type="text" placeholder="IP" value={ip} onChange={e => setIp(e.target.value)} className={styles.filterInput} />
            <select value={exito} onChange={e => setExito(e.target.value)} className={styles.filterInput}>
              <option value="">Todos</option>
              <option value="true">Exitosos</option>
              <option value="false">Fallidos</option>
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className={styles.filterLabel}>Desde</span>
              <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className={styles.filterInput} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className={styles.filterLabel}>Hasta</span>
              <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className={styles.filterInput} />
            </div>
            <button
              className={styles.clearBtn}
              onClick={() => { setCorreo(''); setIp(''); setExito(''); setDesde(''); setHasta(''); }}
            >
              Limpiar
            </button>
          </div>
        </div>

        <div className={styles.tableContainer}>
          {loading ? (
            <Spinner message="Cargando historial..." />
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Estado</th>
                  <th>Correo</th>
                  <th>Método</th>
                  <th>Motivo</th>
                  <th>IP</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td>
                      {r.exito
                        ? <span className={styles.badgeOk}><CheckCircle2 size={13} /> Exitoso</span>
                        : <span className={styles.badgeFail}><XCircle size={13} /> Fallido</span>}
                    </td>
                    <td style={{ fontWeight: 600 }}>{r.correoIntentado}</td>
                    <td>{METODO_LABEL[r.metodo] || r.metodo}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{r.motivoFallo ? (MOTIVO_LABEL[r.motivoFallo] || r.motivoFallo) : '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{r.ip || '—'}</td>
                    <td style={{ fontSize: '12px' }}>{fmtFecha(r.fecha)}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                      No hay registros con los filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button disabled={page <= 0} onClick={() => fetchData(page - 1)} className={styles.pageBtn}>
              <ChevronLeft size={16} /> Anterior
            </button>
            <span className={styles.pageInfo}>
              Página {page + 1} de {totalPages} · {totalElements} registros
            </span>
            <button disabled={page >= totalPages - 1} onClick={() => fetchData(page + 1)} className={styles.pageBtn}>
              Siguiente <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityPanel;
