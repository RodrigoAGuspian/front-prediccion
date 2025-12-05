<template>
  <div class="dashboard-container">
    <h1 class="dashboard-title">
      Predicción TRM
    </h1>
    
    <div class="button-container">
      <button
        @click="cargarTodo"
        class="update-button">
        Actualizar datos
      </button>
    </div>

    <div class="status-container">
      <div v-if="cargando" class="loading-message">
        Cargando datos, por favor espera...
      </div>
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </div>

    <div v-if="!cargando" class="cards-grid">
      <div class="card">
        <p class="card-label">
          Último TRM conocido
        </p>
        <p class="card-value trm-value">
          {{ ultimoReal ? formatoCOP(ultimoReal) : '---' }}
        </p>
      </div>

      <div class="card">
        <p class="card-label">
          Diferencia de mañana
        </p>
        <p class="card-value" :class="diferenciaClass">
          {{ diferenciaPorcentaje }}
        </p>
        <span
          class="tendencia-badge"
          :class="badgeClass">
          {{ tendenciaTexto }}
        </span>
      </div>
    </div>

    <div class="table-container">
      <h2 class="section-title">
        Predicciones TRM próximos 7 días
      </h2>
      <div class="table-wrapper">
        <table class="prediction-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Predicción (COP)</th>
              <th>Serie Sintética</th>
              <th>Serie Ejemplo</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(f, i) in fechas" :key="i">
              <td>{{ f }}</td>
              <td class="prediction-value">{{ formatoCOP(prediccion[i]) }}</td>
              <td class="sintetica-value">{{ formatoCOP(serieSintetica[i]) }}</td>
              <td class="ejemplo-value">{{ formatoCOP(serieEjemplo[i]) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <div class="chart-container">
      <h2 class="section-title">
        Visualización de Tendencias
      </h2>
      <canvas ref="graficoCanvas" class="chart-canvas"></canvas>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import { Chart, LineController, LineElement, PointElement, LinearScale, Title, CategoryScale, Legend } from "chart.js";
Chart.register(LineController, LineElement, PointElement, LinearScale, Title, CategoryScale, Legend);

export default {
  name: "DashboardTRM",
  data() {
    return {
      cargando: false,
      error: null,
      fechas: [],
      prediccion: [],
      ultimoReal: null,
      serieSintetica: [],
      serieEjemplo: [],
      grafico: null
    };
  },
  computed: {
    diferenciaPorcentaje() {
      if (!this.ultimoReal || !this.prediccion.length) return "---";
      const dif = ((this.prediccion[0] - this.ultimoReal) / this.ultimoReal) * 100;
      return (dif >= 0 ? "+" : "") + dif.toFixed(2) + "%";
    },
    diferenciaClass() {
      return this.prediccion[0] >= this.ultimoReal ? "diferencia-positiva" : "diferencia-negativa";
    },
    tendenciaTexto() {
      if (!this.prediccion.length || !this.ultimoReal) return "Sin datos";
      return this.prediccion[0] > this.ultimoReal
        ? "El dólar sube mañana"
        : this.prediccion[0] < this.ultimoReal
        ? "El dólar baja mañana"
        : "Sin cambios significativos";
    },
    badgeClass() {
      if (!this.prediccion.length || !this.ultimoReal) 
        return 'badge-sin-datos';
      
      if (this.prediccion[0] > this.ultimoReal) 
        return 'badge-sube';
      
      if (this.prediccion[0] < this.ultimoReal) 
        return 'badge-baja';
      
      return 'badge-igual';
    }
  },
  methods: {
    async cargarTodo() {
      this.cargando = true;
      this.error = null;
      try {
        await this.obtenerPrediccion();
        await this.obtenerUltimoTRM();
        this.crearSerieSintetica();
        this.crearSerieEjemplo();
        this.dibujarGrafico();
      } catch (e) {
        this.error = "Error cargando datos.";
        console.error(e);
      } finally {
        this.cargando = false;
      }
    },
    async obtenerPrediccion() {
      const r = await axios.get("https://back-prediccion.onrender.com/predict/7days");
      this.prediccion = r.data.forecast_7d || [];
      this.generarFechas();
    },
    async obtenerUltimoTRM() {
      const r = await axios.get("https://www.datos.gov.co/resource/mcec-87by.json?$limit=1&$order=vigenciadesde DESC");
      const valor = r?.data?.[0]?.valor;
      this.ultimoReal = valor ? parseFloat(valor) : null;
      if (!this.ultimoReal) throw new Error("No se pudo obtener el último TRM.");
    },
    crearSerieSintetica() {
      this.serieSintetica = this.prediccion.map(v => Math.round(v * (0.97 + Math.random() * 0.06)));
    },
    crearSerieEjemplo() {
      this.serieEjemplo = this.prediccion.map(v => Math.round(v * (0.99 + Math.random() * 0.03)));
    },
    generarFechas() {
      const hoy = new Date();
      this.fechas = [];
      for (let i = 1; i <= 7; i++) {
        const f = new Date(hoy);
        f.setDate(hoy.getDate() + i);
        const iso = f.toISOString().split("T")[0];
        this.fechas.push(iso);
      }
    },
    dibujarGrafico() {
      if (this.grafico) this.grafico.destroy();
      const ctx = this.$refs.graficoCanvas?.getContext("2d");
      if (!ctx) return;

      this.grafico = new Chart(ctx, {
        type: "line",
        data: {
          labels: this.fechas,
          datasets: [
            {
              label: "Predicción",
              data: this.prediccion,
              borderColor: "#2563eb",
              backgroundColor: "rgba(37, 99, 235, 0.08)",
              tension: 0.3,
              borderWidth: 3,
              pointRadius: 2
            },
            {
              label: "Serie Sintética",
              data: this.serieSintetica,
              borderColor: "#f97316",
              backgroundColor: "rgba(249, 115, 22, 0.08)",
              tension: 0.3,
              borderWidth: 2,
              pointRadius: 0
            },
            {
              label: "Serie Ejemplo",
              data: this.serieEjemplo,
              borderColor: "#9333ea",
              backgroundColor: "rgba(147, 51, 234, 0.08)",
              tension: 0.3,
              borderWidth: 2,
              pointRadius: 0
            }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: "top", labels: { boxWidth: 20, padding: 20 } },
            tooltip: { mode: "index", intersect: false }
          },
          scales: {
            x: { grid: { display: false } },
            y: { beginAtZero: false, grid: { color: "rgba(156,163,175,0.2)" } }
          }
        }
      });
    },
    formatoCOP(n) {
      if (n == null || Number.isNaN(n)) return "---";
      return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
    }
  },
  mounted() {
    this.cargarTodo();
  }
};
</script>

<style scoped>
.dashboard-container {

  margin: 0 auto;
  padding: 64px 16px;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  background-color: #f3f4f6;
  min-height: 100vh;
}

.dashboard-title {
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 64px;
  text-align: center;
  color: #111827;
  letter-spacing: -0.025em;
}

.button-container {
  display: flex;
  justify-content: center;
  margin-bottom: 64px;
}

.update-button {
  padding: 16px 40px;
  background-color: #4f46e5;
  color: white;
  font-size: 1.125rem;
  font-weight: 600;
  border-radius: 9999px;
  box-shadow: 0 20px 25px -5px rgba(79, 70, 229, 0.3);
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.update-button:hover {
  transform: scale(1.03);
  box-shadow: 0 25px 50px -12px rgba(79, 70, 229, 0.5);
}

.update-button:focus {
  outline: none;
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.7);
}

/* ESTADOS */
.status-container {
  margin-bottom: 64px;
}

.loading-message {
  text-align: center;
  color: #4f46e5;
  font-size: 1.25rem;
  margin-bottom: 32px;
  font-weight: 500;
}

.error-message {
  background-color: #fee2e2;
  color: #991b1b;
  padding: 16px;
  border-radius: 12px;
  text-align: center;
  max-width: 36rem;
  margin: 0 auto;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border: 1px solid #fca5a5;
}

/* CARDS */
.cards-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
  margin-bottom: 80px;
}

@media (min-width: 768px) {
  .cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.card {
  background-color: white;
  padding: 40px;
  border-radius: 32px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  text-align: center;
  transition: all 0.3s ease;
}

.card:hover {
  box-shadow: 0 25px 50px -12px rgba(79, 70, 229, 0.3);
}

.card-label {
  color: #6b7280;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 500;
  margin-bottom: 8px;
}

.card-value {
  font-size: 3.75rem;
  font-weight: 800;
  margin-top: 16px;
  margin-bottom: 16px;
}

.trm-value {
  color: #1083b9ff;
}

.diferencia-positiva {
  color: #10b981;
}

.diferencia-negativa {
  color: #ef4444;
}

/* BADGES */
.tendencia-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 16px;
  padding: 8px 16px;
  border-radius: 9999px;
  font-weight: 600;
  font-size: 0.875rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border: 2px solid white;
}

.chart-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 9999px;
  font-weight: 600;
  font-size: 0.75rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.badge-sube {
  background-color: #10b981;
  color: white;
}

.badge-baja {
  background-color: #ef4444;
  color: white;
}

.badge-igual {
  background-color: #6b7280;
  color: white;
}

.badge-sin-datos {
  background-color: #9ca3af;
  color: white;
}

/* TABLA */
.table-container {
  background-color: white;
  padding: 32px;
  border-radius: 32px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  margin-bottom: 80px;
  border: 1px solid #e5e7eb;
}

.section-title {
  font-size: 1.875rem;
  font-weight: 600;
  margin-bottom: 32px;
  color: #1f2937;
  text-align: center;
  letter-spacing: -0.025em;
}

.table-wrapper {
  overflow-x: auto;
}

.prediction-table {
  width: 100%;
  text-align: center;
  border-collapse: collapse;
  font-size: 1rem;
}

.prediction-table thead {
  background-color: #eef2ff;
  color: #4338ca;
  font-weight: bold;
  text-transform: uppercase;
  font-size: 0.75rem;
}

.prediction-table th {
  padding: 16px;
  border-bottom: 2px solid #c7d2fe;
}

.prediction-table td {
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  color: #374151;
  font-weight: 500;
}

.prediction-table tbody tr:hover {
  background-color: rgba(238, 242, 255, 0.5);
}

.prediction-value {
  color: #4f46e5;
  font-weight: 800 !important;
}

.sintetica-value {
  color: #ea580c;
  font-weight: 600 !important;
}

.ejemplo-value {
  color: #9333ea;
  font-weight: 600 !important;
}

/* GRÁFICO */
.chart-container {
  background-color: white;
  padding: 32px;
  border-radius: 32px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.chart-wrapper {
  height: 384px;
  width: auto;
}

.chart-badge-container {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
}

.chart-canvas {
  width: 100%;
  height: 100%;
}

/* MODO OSCURO */
@media (prefers-color-scheme: dark) {
  .dashboard-container {
    background-color: #111827;
  }
  
  .dashboard-title {
    color: #f9fafb;
  }
  
  .card {
    background-color: #1f2937;
    border: 1px solid #374151;
  }
  
  .card-label {
    color: #9ca3af;
  }
  
  .trm-value {
    color: #34c8d3ff;
  }
  
  .table-container,
  .chart-container {
    background-color: #1f2937;
    border-color: #374151;
  }
  
  .section-title {
    color: #f3f4f6;
  }
  
  .prediction-table thead {
    background-color: #374151;
    color: #818cf8;
  }
  
  .prediction-table th {
    border-bottom-color: #4b5563;
  }
  
  .prediction-table td {
    color: #d1d5db;
    border-bottom-color: #374151;
  }
  
  .prediction-table tbody tr:hover {
    background-color: rgba(55, 65, 81, 0.5);
  }
  
  .tendencia-badge {
    border-color: #1f2937;
  }
  
  .error-message {
    background-color: #7f1d1d;
    color: #fca5a5;
    border-color: #b91c1b;
  }
}
</style>