import SimulationPlayer from '@/components/simulation/simulation-player';

export default function SimulationTest() {
  const simulationConfig = {
    controls: [
      {
        name: 'Gravitasi',
        min: 0,
        max: 1,
        step: 0.01,
        default: 0.1
      },
      {
        name: 'Gesekan',
        min: 0.5,
        max: 1,
        step: 0.01,
        default: 0.99
      }
    ],
    initialValues: {
      gravity: 0.1,
      friction: 0.99
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Simulasi Gerak Partikel
            </h1>
            <p className="mt-2 text-gray-600">
              Simulasi interaktif yang menunjukkan pengaruh gravitasi dan gesekan
              terhadap pergerakan partikel.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <SimulationPlayer
              topicId="gerak-partikel"
              type="interactive"
              config={simulationConfig}
            />
          </div>

          <div className="prose prose-primary max-w-none">
            <h2>Penjelasan Simulasi</h2>
            <p>
              Simulasi ini mendemonstrasikan konsep dasar mekanika partikel dengan
              memperlihatkan pengaruh dua gaya utama:
            </p>
            <ul>
              <li>
                <strong>Gravitasi:</strong> Gaya yang menarik partikel ke bawah.
                Semakin besar nilai gravitasi, semakin cepat partikel jatuh.
              </li>
              <li>
                <strong>Gesekan:</strong> Gaya yang melawan gerakan partikel.
                Semakin besar nilai gesekan, semakin cepat partikel kehilangan
                energi kinetiknya.
              </li>
            </ul>
            <p>
              Anda dapat mengubah nilai kedua parameter ini menggunakan penggeser
              di bawah simulasi untuk melihat bagaimana mereka mempengaruhi
              gerakan partikel.
            </p>

            <h3>Konsep Fisika yang Terlibat</h3>
            <ul>
              <li>Hukum Newton tentang Gerak</li>
              <li>Gaya Gravitasi</li>
              <li>Gaya Gesek</li>
              <li>Energi Kinetik dan Potensial</li>
              <li>Momentum dan Tumbukan</li>
            </ul>

            <h3>Tips Penggunaan</h3>
            <ol>
              <li>
                Mulai dengan nilai default untuk memahami perilaku dasar sistem
              </li>
              <li>
                Coba ubah nilai gravitasi ke 0 untuk melihat pengaruh gesekan saja
              </li>
              <li>
                Naikkan nilai gravitasi untuk melihat bagaimana partikel bergerak
                lebih cepat ke bawah
              </li>
              <li>
                Kurangi nilai gesekan untuk melihat partikel bergerak lebih lama
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
