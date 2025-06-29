import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-white px-4">
      <h1 className="text-5xl font-extrabold text-center mb-6">
        Belajar Lebih Pintar <br />
        <span className="text-blue-600">dengan AI Tutor Personal</span>
      </h1>
      <p className="text-center text-lg text-gray-700 max-w-xl mb-8">
        Platform belajar interaktif untuk siswa SMA dengan AI Tutor Personal + Simulasi Visual yang membantu memahami Matematika & Fisika dengan lebih mudah.
      </p>
      <div className="space-x-4">
        <Link href="/login" className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          Mulai Gratis
        </Link>
        <Link href="/pricing" className="px-6 py-3 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200">
          Lihat Paket
        </Link>
      </div>
    </div>
  );
}
