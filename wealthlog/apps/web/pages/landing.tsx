import { useRouter } from "next/router";

export default function Landing() {
  const router = useRouter();

  const handleModuleClick = (path: string) => {
    router.push(path);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-lime-50 to-green-100 p-8">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl p-12">
        <h1 className="text-4xl font-extrabold text-gray-800 mb-8 text-center">
          WealthLog
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div
            onClick={() => handleModuleClick("/tradeManagement")}
            className="cursor-pointer bg-gradient-to-r from-green-100 to-green-200 hover:from-green-200 hover:to-green-300 shadow-md rounded-xl p-8 transition duration-300 ease-in-out transform hover:scale-105"
          >
            <h2 className="text-2xl font-semibold text-green-800 mb-4">
              FX Trade Management
            </h2>
            <p className="text-gray-600">Manage your FX trades with ease.</p>
          </div>
          <div
            className="bg-gray-100 shadow-md rounded-xl p-8"
            title="Coming Soon"
          >
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Stocks</h2>
            <p className="text-gray-500">Coming soon.</p>
          </div>
          <div
            className="bg-gray-100 shadow-md rounded-xl p-8"
            title="Coming Soon"
          >
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">
              Real Estate
            </h2>
            <p className="text-gray-500">Coming soon.</p>
          </div>
          <div
            className="bg-gray-100 shadow-md rounded-xl p-8"
            title="Coming Soon"
          >
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Loans</h2>
            <p className="text-gray-500">Coming soon.</p>
          </div>
        </div>
      </div>
    </div>
  );
}