import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
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

declare var webkitSpeechRecognition: any;
declare var SpeechRecognition: any;

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.css'],
})
export class ReportesComponent implements OnInit, OnDestroy {
  // Formulario
  prompt = '';
  formato: 'texto' | 'pdf' = 'texto';
  modoAudio = false;

  // Voz a texto (SpeechRecognition)
  recognition: any = null;
  grabando = false;
  speechSupported = true;
  procesandoAudio = false;
  private transcripcionParcial = '';

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

  constructor(
    private readonly reportesApi: ReportesApiService,
    private readonly ngZone: NgZone
  ) {
    const saved = localStorage.getItem('reportes_historial');
    if (saved) {
      try { this.historial = JSON.parse(saved); } catch { this.historial = []; }
    }
    // Verificar soporte de SpeechRecognition
    this.speechSupported = !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;
  }

  ngOnInit(): void {
    this.checkIA();
  }

  ngOnDestroy(): void {
    this.detenerTranscripcion();
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

  toggleModoAudio(): void {
    this.modoAudio = !this.modoAudio;
    this.detenerTranscripcion();
    this.transcripcionParcial = '';
    this.reporteGenerado = null;
    this.pdfBlobUrl = null;
    this.errorMsg = '';
  }

  iniciarTranscripcion(): void {
    if (this.grabando) return;

    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      this.errorMsg = 'Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.';
      return;
    }

    this.recognition = new SpeechRecognitionCtor();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'es-ES';

    this.recognition.onresult = (event: any) => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }
      this.ngZone.run(() => {
        this.prompt += finalText;
        this.transcripcionParcial = interimText;
      });
    };

    this.recognition.onerror = (event: any) => {
      this.ngZone.run(() => {
        if (event.error === 'not-allowed') {
          this.errorMsg = 'Acceso al micrófono denegado. Verifica los permisos.';
        } else if (event.error === 'no-speech') {
          // Silencioso, no es error grave
        } else {
          this.errorMsg = `Error de reconocimiento: ${event.error}`;
        }
        this.grabando = false;
      });
    };

    this.recognition.onend = () => {
      this.ngZone.run(() => {
        this.grabando = false;
        this.transcripcionParcial = '';
      });
    };

    try {
      this.recognition.start();
      this.grabando = true;
      this.errorMsg = '';
    } catch {
      this.errorMsg = 'No se pudo iniciar el reconocimiento de voz.';
    }
  }

  detenerTranscripcion(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch { /* ignore */ }
      this.recognition = null;
    }
    this.grabando = false;
    this.transcripcionParcial = '';

    // En modo audio, auto-generar el reporte con lo transcrito
    if (this.modoAudio && this.prompt.trim()) {
      this.generar();
    }
  }

  generar(): void {
    if (!this.prompt.trim()) {
      this.errorMsg = 'Escribe un prompt o usa voz a texto para generar el reporte.';
      return;
    }

    this.loading = true;
    this.procesandoAudio = this.modoAudio;
    this.errorMsg = '';
    this.reporteGenerado = null;
    this.pdfBlobUrl = null;

    this.reportesApi.generarReporte(this.prompt, this.formato).subscribe({
      next: (result) => {
        if (result instanceof Blob) {
          const url = URL.createObjectURL(result);
          this.pdfBlobUrl = url;
          this.pdfFileName = `reporte_${Date.now()}.pdf`;
          this.guardarEnHistorial(this.prompt, this.formato, 'PDF generado');
        } else {
          this.reporteGenerado = result;
          this.guardarEnHistorial(
            result.metadata.prompt_original || this.prompt,
            this.formato,
            result.reporte
          );
        }
        this.loading = false;
        this.procesandoAudio = false;
      },
      error: (err) => {
        this.errorMsg = err?.error?.detail || err?.message || 'Error al generar el reporte. Verifica que Ollama esté disponible.';
        this.loading = false;
        this.procesandoAudio = false;
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
    this.procesandoAudio = false;
    this.transcripcionParcial = '';
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

