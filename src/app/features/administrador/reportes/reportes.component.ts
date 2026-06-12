import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportesApiService, ReporteGenerado, EstadoIA } from '../../../core/servicios/reportes.api.service';

interface HistorialEntry {
  id: number;
  prompt: string;
  formato: string;
  reporte: string;
  fecha: string;
  modelo: string;
}

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.css'],
})
export class ReportesComponent implements OnInit {
  // Formulario
  prompt = '';
  formato: 'texto' | 'pdf' = 'texto';
  archivoAudio: File | null = null;
  modoAudio = false;

  // Estado
  loading = false;
  errorMsg = '';
  reporteGenerado: ReporteGenerado | null = null;
  pdfBlobUrl: string | null = null;
  pdfFileName = '';

  // Estado IA
  estadoIA: EstadoIA | null = null;
  checkingIA = false;
  showIAStatus = false;

  // Historial local
  historial: HistorialEntry[] = [];
  activeTab: 'generar' | 'historial' = 'generar';

  constructor(private readonly reportesApi: ReportesApiService) {
    const saved = localStorage.getItem('reportes_historial');
    if (saved) {
      try { this.historial = JSON.parse(saved); } catch { this.historial = []; }
    }
  }

  ngOnInit(): void {
    this.checkIA();
  }

  checkIA(): void {
    this.checkingIA = true;
    this.showIAStatus = true;
    this.reportesApi.getEstadoIA().subscribe({
      next: (estado) => {
        this.estadoIA = estado;
        this.checkingIA = false;
      },
      error: () => {
        this.estadoIA = {
          ollama_disponible: false,
          url: '',
          modelo_configurado: 'desconocido',
          modelos_instalados: [],
        };
        this.checkingIA = false;
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.archivoAudio = input.files[0];
    }
  }

  toggleModoAudio(): void {
    this.modoAudio = !this.modoAudio;
    this.archivoAudio = null;
    this.reporteGenerado = null;
    this.pdfBlobUrl = null;
    this.errorMsg = '';
  }

  generar(): void {
    if (this.modoAudio && !this.archivoAudio) {
      this.errorMsg = 'Debes seleccionar un archivo de audio.';
      return;
    }
    if (!this.modoAudio && !this.prompt.trim()) {
      this.errorMsg = 'Debes escribir un prompt para generar el reporte.';
      return;
    }

    this.loading = true;
    this.errorMsg = '';
    this.reporteGenerado = null;
    this.pdfBlobUrl = null;

    const obs = this.modoAudio
      ? this.reportesApi.generarReporteAudio(this.archivoAudio!, this.formato)
      : this.reportesApi.generarReporte(this.prompt, this.formato);

    obs.subscribe({
      next: (result) => {
        if (result instanceof Blob) {
          // PDF
          const url = URL.createObjectURL(result);
          this.pdfBlobUrl = url;
          this.pdfFileName = `reporte_${Date.now()}.pdf`;
          this.guardarEnHistorial(this.prompt || 'Reporte por audio', this.formato, 'PDF generado');
        } else {
          // Texto
          this.reporteGenerado = result;
          this.guardarEnHistorial(
            result.metadata.prompt_original || this.prompt || 'Reporte por audio',
            this.formato,
            result.reporte
          );
        }
        this.loading = false;
      },
      error: (err) => {
        this.errorMsg = err?.error?.detail || err?.message || 'Error al generar el reporte. Verifica que Ollama esté disponible.';
        this.loading = false;
      },
    });
  }

  descargarPDF(): void {
    if (this.pdfBlobUrl) {
      const a = document.createElement('a');
      a.href = this.pdfBlobUrl;
      a.download = this.pdfFileName;
      a.click();
    }
  }

  private guardarEnHistorial(prompt: string, formato: string, reporte: string): void {
    const entry: HistorialEntry = {
      id: Date.now(),
      prompt: prompt.slice(0, 100),
      formato,
      reporte: reporte.slice(0, 300),
      fecha: new Date().toISOString(),
      modelo: this.estadoIA?.modelo_configurado || 'desconocido',
    };
    this.historial.unshift(entry);
    if (this.historial.length > 50) this.historial = this.historial.slice(0, 50);
    localStorage.setItem('reportes_historial', JSON.stringify(this.historial));
  }

  limpiarHistorial(): void {
    this.historial = [];
    localStorage.removeItem('reportes_historial');
  }

  nuevoReporte(): void {
    this.reporteGenerado = null;
    this.pdfBlobUrl = null;
    this.errorMsg = '';
    this.prompt = '';
    this.archivoAudio = null;
  }

  copiarReporte(): void {
    if (this.reporteGenerado?.reporte) {
      navigator.clipboard.writeText(this.reporteGenerado.reporte);
    }
  }

  setTab(tab: 'generar' | 'historial'): void {
    this.activeTab = tab;
  }
}

