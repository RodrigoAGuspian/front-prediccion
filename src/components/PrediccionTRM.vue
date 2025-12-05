<template>
  <div class="max-w-5xl mx-auto py-10 px-4">

    <!-- TÍTULO -->
    <h1 class="text-4xl font-bold mb-10 text-center text-gray-800">
      📊 Predicción y Comparación TRM – Dashboard
    </h1>

    <!-- BOTÓN PRINCIPAL -->
    <div class="flex justify-center mb-8">
      <button
        @click="cargarTodo"
        class="px-6 py-3 bg-blue-600 text-white text-lg rounded-xl shadow hover:bg-blue-700 transition"
      >
        Actualizar datos
      </button>
    </div>

    <!-- CARGANDO -->
    <div v-if="cargando" class="text-center text-gray-600 text-lg">
      Cargando datos, por favor espera...
    </div>

    <!-- ERROR -->
    <div
      v-if="error"
      class="bg-red-100 text-red-700 p-4 rounded-lg text-center max-w-xl mx-auto mb-6"
    >
      {{ error }}
    </div>

    <!-- TARJETAS DE VALORES -->
    <div v-if="!cargando" class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">

      <!-- TRM REAL -->
      <div class="bg-white p-6 rounded-2xl shadow border">
        <p class="text-gray-500 text-sm">Último valor TRM</p>
        <p class="text-3xl font-bold text-green-600">
          {{ ultimoReal ? ultimoReal + ' COP' : '---' }}
        </p>
      </div>

      <!-- PREDICCIÓN -->
      <div class="bg-white p-6 rounded-2xl shadow border">
        <p class="text-gray-500 text-sm">Predicción para mañana</p>
        <p class="text-3xl font-bold text-blue-600">
          {{ prediccion.length ? prediccion[0] + ' COP' : '---' }}
        </p>
      </div>

      <!-- DIFERENCIA -->
      <div class="bg-white p-6 rounded-2xl shadow border">
        <p class="text-gray-500 text-sm">Diferencia (%)</p>
        <p
          class="text-3xl font-bold"
          :class="diferenciaColor"
        >
          {{ diferenciaPorcentaje }}
        </p>
      </div>
    </div>

    <!-- TABLA -->
    <div class="bg-white p-6 rounded-2xl shadow border mb-10">
      <h2 class="text-2xl font-semibold mb-4">Tabla comparativa (7 días)</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-center text-sm border-collapse">
          <thead class="bg-gray-100 text-gray-700">
            <tr>
              <th class="py-2 px-3 border">Fecha</th>
              <th class="py-2 px-3 border">TRM Real</th>
              <th class="py-2 px-3 border">Predicción</th>
              <th class="py-2 px-3 border">Serie Sintética</th>
              <th class="py-2 px-3 border">Serie Real Ejemplo</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(f, i) in fechas"
              :key="i"
              class="hover:bg-gray-50"
            >
              <td class="py-2 px-3 border">{{ f }}</td>
              <td class="py-2 px-3 border">{{ trmReal[i] }}</td>
              <td class="py-2 px-3 border">{{ prediccion[i] }}</td>
              <td class="py-2 px-3 border">{{ serieSintetica[i] }}</td>
              <td class="py-2 px-3 border">{{ serieEjemplo[i] }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- GRÁFICO -->
    <div class="bg-white p-6 rounded-2xl shadow border">
      <h2 class="text-2xl font-semibold mb-4">Visualización de Tendencias</h2>
      <canvas ref="graficoCanvas"></canvas>
    </div>

  </div>
</template>

<script>
import axios from "axios";
import { Chart, LineController, LineElement, PointElement, LinearScale, Title, CategoryScale, Legend } from "chart.js";
Chart.register(LineController, LineElement, PointElement, LinearScale, Title, CategoryScale, Legend);

export default {
  data() {
    return {
      cargando: false,
      error: null,

      fechas: [],
      prediccion: [],
      trmReal: [],
      serieSintetica: [],
      serieEjemplo: [],

      ultimoReal: null,
      grafico: null
    };
  },

  computed: {
    diferenciaPorcentaje() {
      if (!this.ultimoReal || !this.prediccion.length) return "---";
      const dif = ((this.prediccion[0] - this.ultimoReal) / this.ultimoReal) * 100;
      return dif.toFixed(2) + "%";
    },
    diferenciaColor() {
      if (!this.prediccion.length || !this.ultimoReal) return "text-gray-800";
      return this.prediccion[0] >= this.ultimoReal ? "text-red-500" : "text-green-500";
    }
  },

  methods: {
    async cargarTodo() {
      this.cargando = true;
      this.error = null;

      try {
        await this.obtenerPrediccion();
        await this.obtenerTRMReal();
        this.crearSerieSintetica();
        this.crearSerieEjemplo();
        this.dibujarGrafico();

      } catch (e) {
        this.error = "Error cargando datos.";
      } finally {
        this.cargando = false;
      }
    },

    // --- Predicción ---
    async obtenerPrediccion() {
      const r = await axios.get("https://back-prediccion.onrender.com/predict/7days");
      this.prediccion = r.data.forecast_7d;
      this.generarFechas();
    },

    // --- TRM REAL ---
    async obtenerTRMReal() {
      const r = await axios.get(
        "https://www.datos.gov.co/resource/mcec-87by.json?$limit=7&$order=vigenciadesde DESC"
      );

      const valores = r.data.map(x => parseFloat(x.valor));
      this.ultimoReal = valores[0];
      this.trmReal = [...valores].reverse();
    },

    // --- SERIES ADICIONALES ---
    crearSerieSintetica() {
      this.serieSintetica = this.prediccion.map(v =>
        Math.round(v * (0.97 + Math.random() * 0.06))
      );
    },

    crearSerieEjemplo() {
      this.serieEjemplo = this.trmReal.map(v =>
        Math.round(v * (0.99 + Math.random() * 0.03))
      );
    },

    // --- Fechas ---
    generarFechas() {
      const hoy = new Date();
      this.fechas = [];

      for (let i = 1; i <= 7; i++) {
        const f = new Date(hoy);
        f.setDate(hoy.getDate() + i);
        this.fechas.push(f.toISOString().split("T")[0]);
      }
    },

    // --- GRÁFICA ---
    dibujarGrafico() {
      if (this.grafico) this.grafico.destroy();

      const ctx = this.$refs.graficoCanvas.getContext("2d");

      this.grafico = new Chart(ctx, {
        type: "line",
        data: {
          labels: this.fechas,
          datasets: [
            {
              label: "TRM Real",
              data: this.trmReal,
              borderColor: "#16a34a",
              tension: 0.3,
              borderWidth: 3
            },
            {
              label: "Predicción",
              data: this.prediccion,
              borderColor: "#2563eb",
              tension: 0.3,
              borderWidth: 3
            },
            {
              label: "Serie Sintética",
              data: this.serieSintetica,
              borderColor: "#f97316",
              tension: 0.3,
              borderWidth: 2
            },
            {
              label: "Serie Ejemplo",
              data: this.serieEjemplo,
              borderColor: "#9333ea",
              tension: 0.3,
              borderWidth: 2
            }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: "top",
              labels: { boxWidth: 20, padding: 20 }
            }
          },
          scales: {
            y: {
              beginAtZero: false
            }
          }
        }
      });
    }
  }
};
</script>
