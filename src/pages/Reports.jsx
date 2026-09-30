/**
 * Página de reportes y dashboard estadístico GEA.
 *
 * Dashboard: gráficos Recharts (AreaChart de eventos por mes, PieChart por estado,
 * BarChart por oficina). Datos servidos por `getDashboardStats`, cuyo alcance
 * es filtrado por el backend según el rol del usuario autenticado.
 *
 * Historial de reportes: lista paginada en cliente de reportes previos, descargables
 * como Blob. El botón de descarga llama a `exportReporte` que devuelve el binario;
 * el cliente crea un enlace temporal idéntico al de `ExportAgendaModal`.
 *
 * `CustomTooltip` es un componente estático (no tiene estado propio) que Recharts
 * renderiza cuando el cursor se sitúa sobre una barra o área del gráfico.
 *
 * `ErrorBoundary` envuelve el bloque de gráficos porque Recharts puede lanzar
 * durante el render si los datos tienen formato inesperado.
 */
import React, { useState, useEffect, useMemo, useContext } from 'react';
import { FileText, Download, Plus, Search, Calendar, Info, BarChart3, CheckCircle2, Clock, XCircle, TrendingUp, Building2, CalendarRange, Layers } from 'lucide-react';
import styles from './Reports.module.css';
import { getReportes, exportReporte, getDashboardStats } from '../services/reportes.service';
import { getOficinas } from '../services/oficinas.service';
import Spinner from '../components/ui/Spinner';
import GenerateReportModal from '../components/ui/GenerateReportModal';
import ReportDetailModal from '../components/ui/ReportDetailModal';
import ErrorBoundary from '../components/ErrorBoundary';
import { AuthContext } from '../context/AuthContext';
import notification from '../utils/notification';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, Legend, LabelList
} from 'recharts';

// ─── Constants ──────────────────────────────────────────────────────────────
const DATE_FILTERS = [
  { label: 'Todas las fechas', value: 'all' },
  { label: 'Hoy', value: 'today' },
  { label: 'Esta semana', value: 'week' },
  { label: 'Este mes', value: 'month' },
];

const today = new Date();
const toYMD = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Paleta categórica de respaldo (para "Eventos por tipo" cuando el catálogo no
// trae color propio) — orden fijo, validado con el validador de daltonismo del
// skill de dataviz (ΔE mínimo adyacente 24.6, todas pasan banda de luminosidad,
// piso de croma y contraste ≥3:1 sobre superficie blanca). No ciclar ni agregar
// tonos sueltos: si algún día hacen falta más de 6, hay que revalidar el set.
const STAT_COLORS = ['#ce1126', '#1f6c9f', '#2e7d44', '#b06d00', '#7c3aed', '#0891b2'];

// Rampa secuencial (un solo tono, más oscuro = más solicitudes) para "Solicitudes
// por Oficina": más vistosa que un rojo plano sin caer en el error de pintar
// cada barra de un color distinto (eso confundiría color con identidad cuando
// el eje Y ya distingue cada oficina). Validada en modo --ordinal: luminosidad
// monótona, salto perceptible entre pasos y el extremo claro sigue legible.
const OFICINA_RAMP = ['#8c0c1a', '#a90f20', '#ce1126', '#dc3e4f', '#e8848c'];

// Alineados con los mismos hex que ya usa statusConfig en EventDetailModal.jsx /
// AnnouncementDetailModal.jsx — un mismo estado debe verse del mismo color en
// toda la app, no solo en este dashboard.
const STATUS_COLORS = {
  'APROBADA':    '#10b981',
  'PENDIENTE':   '#f59e0b',
  'RECHAZADA':   '#ef4444',
  'PUBLICADA':   '#0ea5e9',
  'EN_REVISION': '#8b5cf6',
};

const ESTADO_LABELS = {
  'APROBADA':    'Aprobada',
  'PENDIENTE':   'Pendiente',
  'RECHAZADA':   'Rechazada',
  'PUBLICADA':   'Publicada',
  'EN_REVISION': 'En revisión',
};
const formatEstado = (s) => ESTADO_LABELS[s] || (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const fmtNum = (n) => new Intl.NumberFormat('es-CO').format(n ?? 0);

// Tooltip compartido por los tres gráficos (área, barras, dona). El valor va en
// tinta de texto normal, nunca en el color de la serie — la identidad la lleva
// el punto de color junto al texto, no el texto mismo.
const CustomTooltip = ({ active, payload, label, color = '#ce1126', unitLabel = 'Solicitudes' }) => {
  if (active && payload && payload.length) {
    const entry = payload[0];
    return (
      <div style={{ backgroundColor: 'var(--surface)', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-md)' }}>
        {label && <p style={{ margin: '0 0 4px', fontWeight: '700', fontSize: '12px', color: 'var(--text-main)' }}>{label}</p>}
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.payload?.fill || color, flexShrink: 0 }} />
          {entry.name || unitLabel}: <strong style={{ color: 'var(--text-main)', fontWeight: '800' }}>{fmtNum(entry.value)}</strong>
        </p>
      </div>
    );
  }
  return null;
};

const TIPO_OPTIONS = [
  { val: 'GLOBAL', label: 'Todo' },
  { val: 'EVENTOS', label: 'Eventos' },
  { val: 'ANUNCIOS', label: 'Anuncios' },
];

const StatsDashboard = ({ stats, loading, tipoFilter, onTipoChange, oficinaLabel, desde, hasta }) => {
  // Solo retornamos nulo si no hay datos NI estamos cargando (error crítico)
  if (!stats && !loading) return null;

  const safeStats = stats || {
    totalSolicitudes: 0, totalAprobados: 0, totalPendientes: 0,
    totalRechazados: 0, tasaAprobacion: 0,
    eventosPorTipo: [], solicitudesPorOficina: [], tendenciaEstado: [], solicitudesPorMes: []
  };

  const meses = safeStats.solicitudesPorMes || [];
  // Ordenadas de mayor a menor para que la barra más larga (la oficina líder)
  // quede arriba — más fácil de leer de un vistazo que el orden crudo del backend.
  const porOficina = [...(safeStats.solicitudesPorOficina || [])].sort((a, b) => (b.valor || 0) - (a.valor || 0));
  const estadosRaw = safeStats.tendenciaEstado || [];
  const estados = estadosRaw.map(e => ({ ...e, _raw: e.etiqueta, etiqueta: formatEstado(e.etiqueta) }));
  const categorias = safeStats.eventosPorTipo || [];

  const publicadas = (estadosRaw.find(e => (e.etiqueta || '').toUpperCase() === 'PUBLICADA')?.valor) || 0;
  const esAnuncios = tipoFilter === 'ANUNCIOS';

  const fmt = fmtNum;

  // Punto más alto y último punto de la tendencia mensual — los dos únicos
  // valores que se rotulan directamente sobre el área (nunca todos: eso se
  // vuelve ruido). El resto queda disponible en los ticks del eje Y y el tooltip.
  const peakIndex = meses.length > 0
    ? meses.reduce((best, m, i) => (m.valor > meses[best].valor ? i : best), 0)
    : -1;
  const lastIndex = meses.length - 1;
  const renderTrendDot = (props) => {
    const { cx, cy, index } = props;
    const isLast = index === lastIndex;
    const isPeak = index === peakIndex && !isLast;
    if (!isLast && !isPeak) return <circle key={`dot-${index}`} cx={cx} cy={cy} r={0} />;
    return (
      <g key={`dot-${index}`}>
        <circle cx={cx} cy={cy} r={5} fill="#ce1126" stroke="#fff" strokeWidth={2} />
        <text x={cx} y={cy - 12} textAnchor="middle" fontSize={11} fontWeight="800" fill="var(--text-main)">
          {fmtNum(meses[index]?.valor)}
        </text>
      </g>
    );
  };

  const totalEstados = estados.reduce((sum, e) => sum + (e.valor || 0), 0);
  const maxCategoria = Math.max(1, ...categorias.map(c => c.valor || 0));

  const kpis = [
    { label: 'Total Solicitudes', value: fmt(safeStats.totalSolicitudes), Icon: BarChart3, color: '#3b82f6' },
    { label: 'Aprobadas', value: fmt(safeStats.totalAprobados), Icon: CheckCircle2, color: '#16a34a' },
    { label: 'Pendientes', value: fmt(safeStats.totalPendientes), Icon: Clock, color: '#f59e0b' },
    { label: 'Rechazadas', value: fmt(safeStats.totalRechazados), Icon: XCircle, color: '#ce1126' },
    { label: 'Tasa Aprobación', value: `${safeStats.tasaAprobacion ?? 0}%`, Icon: TrendingUp, color: '#8b5cf6' },
  ];

  // recharts 3.x con React 19 necesita height numérico explícito en el contenedor
  // NO usar height="100%" en el div wrapper — dar valor fijo en px
  const CHART_HEIGHT = 250;

  const tipoLabel = TIPO_OPTIONS.find(t => t.val === tipoFilter)?.label || 'Todo';

  return (
    <div className={styles.dashboard} style={{ position: 'relative' }}>
      {/* Cabecera del panel: título + selector segmentado */}
      <div className={styles.statsHeader}>
        <div>
          <h2 className={styles.statsTitle}>Panel de Estadísticas</h2>
          <p className={styles.statsSubtitle}>Análisis de solicitudes según los filtros seleccionados</p>
        </div>
        <div className={styles.tabs} role="tablist" aria-label="Filtrar estadísticas por tipo">
          {TIPO_OPTIONS.map(opt => (
            <button
              key={opt.val}
              role="tab"
              aria-selected={tipoFilter === opt.val}
              className={`${styles.tabBtn} ${tipoFilter === opt.val ? styles.active : ''}`}
              onClick={() => onTipoChange(opt.val)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chips de filtros activos */}
      <div className={styles.filterChips}>
        <span className={styles.chip}><Layers size={12} /> {tipoLabel}</span>
        {oficinaLabel && <span className={styles.chip}><Building2 size={12} /> {oficinaLabel}</span>}
        {(desde || hasta) && (
          <span className={styles.chip}>
            <CalendarRange size={12} /> {desde || '...'} → {hasta || '...'}
          </span>
        )}
      </div>

      {/* Overlay de carga elegante */}
      {loading && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 50, background: 'rgba(255,255,255,0.88)',
          borderRadius: 'var(--radius-md)',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid var(--border)', borderTop: '4px solid var(--primary)', borderRadius: '50%', marginBottom: '12px', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: '800' }}>Actualizando Analíticas...</p>
        </div>
      )}

      <div className={styles.statsGrid}>
        {kpis.map((kpi, idx) => (
          <div key={idx} className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: `${kpi.color}15`, color: kpi.color }}>
              <kpi.Icon size={24} />
            </div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{kpi.value}</div>
              <div className={styles.statLabel}>{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.chartsGrid}>
        {/* Gráfico de Tendencia Mensual */}
        <div className={styles.chartContainer} style={{ minHeight: '340px' }}>
          <div className={styles.chartTitle}>Tendencia Mensual de Solicitudes</div>
          {/* height numérico explícito — clave para recharts 3.x + React 19 */}
          <div style={{ height: CHART_HEIGHT, width: '100%', marginTop: '20px' }}>
            {meses.length > 0 ? (
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <AreaChart data={meses} margin={{ top: 32, right: 24, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ce1126" stopOpacity={0.28}/>
                      <stop offset="95%" stopColor="#ce1126" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="etiqueta" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: 'var(--text-secondary)'}} dy={10} />
                  <YAxis
                    allowDecimals={false}
                    domain={[0, 'dataMax + 1']}
                    axisLine={false}
                    tickLine={false}
                    width={26}
                    tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                  />
                  <Tooltip content={<CustomTooltip color="#ce1126" />} />
                  <Area type="monotone" dataKey="valor" name="Solicitudes" stroke="#ce1126" strokeWidth={2} fillOpacity={1} fill="url(#colorVal)" dot={renderTrendDot} activeDot={{ r: 5, fill: '#ce1126', stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className={styles.noDataPlaceholder}>No hay tendencia registrada en este periodo</div>
            )}
          </div>
        </div>

        {/* Gráfico por Oficina */}
        <div className={styles.chartContainer} style={{ minHeight: '340px' }}>
          <div className={styles.chartTitle}>Solicitudes por Oficina</div>
          <div style={{ height: CHART_HEIGHT, width: '100%', marginTop: '20px' }}>
            {porOficina.length > 0 ? (
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <BarChart layout="vertical" data={porOficina.slice(0, 5)} margin={{ left: 20, right: 34, top: 5, bottom: 5 }}>
                  <CartesianGrid horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis dataKey="etiqueta" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: 'var(--text-secondary)'}} width={90} />
                  <Tooltip content={<CustomTooltip color="#ce1126" />} cursor={{ fill: 'var(--surface-2)' }} />
                  {/* Un solo tono por rango (no un color distinto por oficina):
                      la oficina líder queda en el rojo más intenso y decae hacia
                      el más claro — da variedad visual sin que el color compita
                      con el nombre del eje Y como identidad de cada barra. */}
                  <Bar dataKey="valor" name="Solicitudes" radius={[0, 4, 4, 0]} maxBarSize={22}>
                    {porOficina.slice(0, 5).map((entry, index) => (
                      <Cell key={`cell-oficina-${index}`} fill={OFICINA_RAMP[index % OFICINA_RAMP.length]} />
                    ))}
                    <LabelList dataKey="valor" position="right" formatter={fmtNum} style={{ fontSize: 11, fontWeight: 800, fill: 'var(--text-main)' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className={styles.noDataPlaceholder}>No hay datos por oficina</div>
            )}
          </div>
        </div>

        {/* Distribución de Estados */}
        <div className={styles.chartContainer} style={{ minHeight: '340px' }}>
          <div className={styles.chartTitle}>Distribución de Estados</div>
          <div style={{ height: CHART_HEIGHT, width: '100%', position: 'relative' }}>
            {estados.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                  <PieChart>
                    <Pie
                      data={estados}
                      cx="50%"
                      cy="46%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      stroke="var(--surface)"
                      strokeWidth={2}
                      dataKey="valor"
                      nameKey="etiqueta"
                    >
                      {estados.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry._raw] || STAT_COLORS[index % STAT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [
                        `${fmtNum(value)} (${totalEstados > 0 ? Math.round((value / totalEstados) * 100) : 0}%)`,
                        name,
                      ]}
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: '11px' }}
                      formatter={(value, entry) => (
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {value} <strong style={{ color: 'var(--text-main)' }}>({fmtNum(entry.payload?.valor)})</strong>
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Total al centro de la dona — el número que resume todo el
                    gráfico de un vistazo, sin tener que sumar los segmentos. */}
                <div style={{
                  position: 'absolute', top: 'calc(46% - 2px)', left: '50%', transform: 'translate(-50%, -50%)',
                  textAlign: 'center', pointerEvents: 'none'
                }}>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)', lineHeight: 1 }}>{fmtNum(totalEstados)}</div>
                  <div style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '3px' }}>Total</div>
                </div>
              </>
            ) : (
              <div className={styles.noDataPlaceholder}>Sin estados registrados</div>
            )}
          </div>
        </div>

        {/* Eventos por tipo (solo aplica a eventos) */}
        {!esAnuncios && (
          <div className={styles.chartContainer} style={{ minHeight: '340px' }}>
            <div className={styles.chartTitle}>Eventos por tipo</div>
            <div style={{ height: CHART_HEIGHT, width: '100%', marginTop: '18px', overflowY: 'auto' }}>
              {categorias.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {categorias.slice(0, 6).map((item, idx) => {
                    const color = item.color || STAT_COLORS[idx % STAT_COLORS.length];
                    const pct = Math.max(2, Math.round(((item.valor || 0) / maxCategoria) * 100));
                    return (
                      <div key={idx}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.etiqueta}</span>
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', flexShrink: 0, marginLeft: '10px' }}>{fmtNum(item.valor)}</span>
                        </div>
                        {/* Barra proporcional: hace comparable la magnitud entre
                            tipos de un vistazo, en vez de solo leer números sueltos. */}
                        <div style={{ height: '8px', borderRadius: 'var(--radius-pill)', background: 'var(--surface-2)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, borderRadius: 'var(--radius-pill)', background: color, transition: 'width var(--dur-slow) var(--ease-standard)' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.noDataPlaceholder}>No hay tipos de evento registrados</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


const Reports = () => {
  const { user } = useContext(AuthContext);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [exportingId, setExportingId] = useState(null);
  const [oficinas, setOficinas] = useState([]);
  const [oficinaFilter, setOficinaFilter] = useState('');
  const [desdeFilter, setDesdeFilter] = useState('');
  const [hastaFilter, setHastaFilter] = useState('');
  const [tipoFilter, setTipoFilter] = useState('GLOBAL');
  const [stats, setStats] = useState({
    totalSolicitudes: 0,
    totalAprobados: 0,
    totalPendientes: 0,
    totalRechazados: 0,
    tasaAprobacion: 0,
    eventosPorTipo: [],
    solicitudesPorOficina: [],
    tendenciaEstado: [],
    solicitudesPorMes: []
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const loadOficinas = async () => {
      const userRol = user?.rol?.toString().toUpperCase() || '';
      const isPrivileged = ['SUPER_ADMIN', 'ADMIN', 'COMUNICACIONES'].includes(userRol);
      if (!isPrivileged) return;

      try {
        const response = await getOficinas({ skipGlobalError: true });
        setOficinas(Array.isArray(response) ? response : response?.data || []);
      } catch (err) {
        console.error("Error cargando oficinas:", err);
      }
    };
    if (user) loadOficinas();
  }, [user]);

  // BLINDAJE: Si es rol OFICINA, fijar el filtro a su propia oficina
  useEffect(() => {
    if (user && (user.rol === 'OFICINA' || user.rol === 'USUARIO_AUTENTICADO_APP') && user.idOficina) {
      setOficinaFilter(user.idOficina.toString());
    }
  }, [user]);

  const canViewStats = user && ['SUPER_ADMIN', 'COMUNICACIONES'].includes(user?.rol?.toString().toUpperCase());

  useEffect(() => {
    if (user) {
      const filters = {
        idOficina: oficinaFilter !== 'all' ? oficinaFilter : null,
        desde: desdeFilter,
        hasta: hastaFilter
      };

      fetchData(filters);
      if (canViewStats) {
        fetchDashboardStats({ ...filters, tipo: tipoFilter });
      }
    }
  }, [user, oficinaFilter, desdeFilter, hastaFilter, tipoFilter, canViewStats]);

  const fetchDashboardStats = async (filters) => {
    try {
      setStatsLoading(true);
      const res = await getDashboardStats(filters);
      setStats(res || {
        totalSolicitudes: 0,
        totalAprobados: 0,
        totalPendientes: 0,
        totalRechazados: 0,
        tasaAprobacion: 0,
        eventosPorTipo: [],
        solicitudesPorOficina: [],
        tendenciaEstado: [],
        solicitudesPorMes: []
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchData = async (filters = {}) => {
    try {
      setLoading(true);
      const data = await getReportes(filters);
      setReports(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      if (!err.handledByInterceptor) {
        notification.error('Error al cargar la lista de reportes');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = useMemo(() => {
    return reports.filter(item => {
      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const title = (item.titulo || '').toLowerCase();
        const desc = (item.descripcion || '').toLowerCase();
        if (!title.includes(q) && !desc.includes(q)) return false;
      }

      return true;
    });
  }, [reports, searchTerm]);

  const handleExport = async (report) => {
    try {
      setExportingId(report.id);
      const blob = await exportReporte(report.id);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const extension = (report.formato || 'PDF').toLowerCase();
      link.setAttribute('download', `reporte-${report.id}.${extension}`);
      
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      notification.success('Reporte exportado correctamente');
    } catch (err) {
      console.error('Error exportando reporte:', err);
      const msg = err.response?.data?.message || 'No fue posible descargar el archivo. Por favor intente más tarde.';
      notification.error('Error al exportar: ' + msg);
    } finally {
      setExportingId(null);
    }
  };

  if (!user) return <Spinner message="Cargando perfil..." />;

  return (
    <div className="page-container">
      <div className={styles.header}>
        <h1 className="page-title" style={{marginBottom: 0}}>Gestión de Reportes</h1>
        <button 
          className={styles.createBtn}
          onClick={() => setIsGenerateModalOpen(true)}
        >
          <Plus size={18}/> Nuevo Reporte
        </button>
      </div>


      <div className="card">
        <div className={styles.filterToolbar}>
          {/* Búsqueda */}
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Buscar reporte por título o descripción..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          {/* Filtros */}
          <div className={styles.filterRow}>
            <select
              className={styles.filterSelect}
              value={dateFilter}
              onChange={e => {
                const val = e.target.value;
                setDateFilter(val);
                if (val === 'all') {
                  setDesdeFilter('');
                  setHastaFilter('');
                } else {
                  const now = new Date();
                  let start = new Date(now);
                  let end = new Date(now);
                  if (val === 'week') {
                    start.setDate(now.getDate() - now.getDay());
                    end.setDate(now.getDate() + (6 - now.getDay()));
                  } else if (val === 'month') {
                    start = new Date(now.getFullYear(), now.getMonth(), 1);
                    end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                  }
                  setDesdeFilter(toYMD(start));
                  setHastaFilter(toYMD(end));
                }
              }}
            >
              {DATE_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>

            <div className={styles.filterDivider} />

            <select
              className={styles.filterSelect}
              style={{
                minWidth: '160px',
                backgroundColor: (user?.rol === 'OFICINA' || user?.rol === 'USUARIO_AUTENTICADO_APP') ? 'var(--surface-2)' : 'white',
                cursor: (user?.rol === 'OFICINA' || user?.rol === 'USUARIO_AUTENTICADO_APP') ? 'not-allowed' : 'pointer'
              }}
              value={oficinaFilter}
              onChange={e => setOficinaFilter(e.target.value)}
              disabled={user?.rol === 'OFICINA' || user?.rol === 'USUARIO_AUTENTICADO_APP'}
            >
              {!(user?.rol === 'OFICINA' || user?.rol === 'USUARIO_AUTENTICADO_APP') && <option value="">Todas las oficinas</option>}
              {(user?.rol === 'OFICINA' || user?.rol === 'USUARIO_AUTENTICADO_APP') && oficinas.length === 0 && user.idOficina && (
                <option value={user.idOficina}>{user.oficinaNombre || 'Cargando oficina...'}</option>
              )}
              {oficinas.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </select>

            <div className={styles.filterDivider} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className={styles.filterLabel}>Desde</span>
              <input type="date" className={styles.filterSelect} style={{ paddingLeft: '10px', paddingRight: '10px' }} value={desdeFilter} onChange={e => setDesdeFilter(e.target.value)} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className={styles.filterLabel}>Hasta</span>
              <input type="date" className={styles.filterSelect} style={{ paddingLeft: '10px', paddingRight: '10px' }} value={hastaFilter} onChange={e => setHastaFilter(e.target.value)} />
            </div>

            <button
              style={{ marginLeft: 'auto', padding: '0 16px', height: '36px', borderRadius: '20px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.82rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
              onClick={() => {
                if (!(user?.rol === 'OFICINA' || user?.rol === 'USUARIO_AUTENTICADO_APP')) setOficinaFilter('');
                setDesdeFilter('');
                setHastaFilter('');
                setSearchTerm('');
                setDateFilter('all');
                setTipoFilter('GLOBAL');
              }}
            >
              Limpiar filtros
            </button>
          </div>
        </div>

        <div className={styles.tableContainer}>
          {loading ? (
            <Spinner message="Obteniendo reportes..." />
          ) : error ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>
              <Info size={32} style={{ marginBottom: '12px' }} />
              <p>{error}</p>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>Nombre del Reporte</th>
                  <th>Descripción</th>
                  <th>Oficina</th>
                  <th>Usuario</th>
                  <th>Fecha Generación</th>
                  <th>Formato</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(filteredReports || []).map((report, index) => (
                  <tr key={report.id}>
                    <td style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>{index + 1}</td>
                    <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>#{report.id}</td>
                    <td>
                      <div className={styles.truncate} style={{ color: 'var(--primary)', fontWeight: 'bold' }} title={report.titulo}>
                        {report.titulo}
                      </div>
                    </td>
                    <td className={styles.truncate} title={report.descripcion}>{report.descripcion}</td>
                    <td style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>{report.usuarioOficina}</td>
                    <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{report.usuarioCorreo}</td>
                    <td style={{ fontSize: '12px' }}>
                      {report.fecha !== '-' ? new Date(report.fecha).toLocaleDateString('es-CO') : '-'}
                    </td>
                    <td>
                      {(() => {
                        const fmt = (report.formato || 'PDF').toUpperCase();
                        const colors = {
                          PDF:  { bg: '#fff1f2', color: '#ce1126', border: '#fecaca' },
                          XLSX: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
                          CSV:  { bg: '#f0f9ff', color: '#0284c7', border: '#bae6fd' },
                        };
                        const c = colors[fmt] || colors.PDF;
                        return (
                          <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: '800', backgroundColor: c.bg, color: c.color, border: `1px solid ${c.border}`, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {fmt}
                          </span>
                        );
                      })()}
                    </td>
                    <td>
                      <div style={{ display: 'flex' }}>
                        <button 
                          className={styles.actionBtn}
                          onClick={() => setSelectedReport(report)}
                        >
                          Ver
                        </button>
                        <button 
                          className={styles.exportBtn}
                          disabled={exportingId === report.id}
                          onClick={() => handleExport(report)}
                        >
                          {exportingId === report.id ? '...' : <Download size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredReports.length === 0 && (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                        <FileText size={40} style={{ opacity: 0.2 }} />
                        <span>No se encontraron reportes con los filtros aplicados.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {canViewStats && (
        <div style={{ marginTop: '32px' }}>
          <ErrorBoundary resetOnPropsChange={stats}>
            <StatsDashboard
              stats={stats}
              loading={statsLoading}
              tipoFilter={tipoFilter}
              onTipoChange={setTipoFilter}
              oficinaLabel={oficinaFilter ? (oficinas.find(o => String(o.id) === String(oficinaFilter))?.nombre || null) : null}
              desde={desdeFilter}
              hasta={hastaFilter}
            />
          </ErrorBoundary>
        </div>
      )}

      {/* ── Modal de Creación protegido con ErrorBoundary ── */}
      <ErrorBoundary isModal={true} resetOnPropsChange={isGenerateModalOpen}>
        <GenerateReportModal 
          isOpen={isGenerateModalOpen}
          onClose={() => setIsGenerateModalOpen(false)}
          onSuccess={fetchData}
        />
      </ErrorBoundary>

      <ErrorBoundary isModal={true} resetOnPropsChange={!!selectedReport}>
        <ReportDetailModal 
          isOpen={!!selectedReport}
          onClose={() => setSelectedReport(null)}
          report={selectedReport}
          onExport={handleExport}
        />
      </ErrorBoundary>
    </div>
  );
};

export default Reports;
