import React from "react";
import PageBreadcrumb from "../common/PageBreadCrumb";
import PageMeta from "../common/PageMeta";

interface TablePlaceholderProps {
  title: string;
  columns: string[];
}

export default function TablePlaceholder({ title, columns }: TablePlaceholderProps) {
  // Mock data
  const rows = [1, 2, 3, 4, 5];

  return (
    <div>
      <PageMeta title={`${title} | SIMAK`} description={`Halaman ${title}`} />
      <PageBreadcrumb pageTitle={title} />
      
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="px-5 py-6 sm:px-10 flex justify-between items-center border-b border-gray-100 dark:border-gray-800">
           <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{title}</h3>
           <button className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors">
              Tambah Data
           </button>
        </div>
        
        <div className="max-w-full overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-5 py-4 sm:px-10 text-xs font-medium text-gray-500 uppercase dark:text-gray-400">No</th>
                {columns.map((col, idx) => (
                  <th key={idx} className="px-5 py-4 text-xs font-medium text-gray-500 uppercase dark:text-gray-400">
                    {col}
                  </th>
                ))}
                <th className="px-5 py-4 sm:px-10 text-xs font-medium text-gray-500 uppercase dark:text-gray-400 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {rows.map((row) => (
                <tr key={row}>
                  <td className="px-5 py-4 sm:px-10 text-sm text-gray-800 dark:text-white/90">{row}</td>
                  {columns.map((_, idx) => (
                    <td key={idx} className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      Data {idx + 1} Kolom {row}
                    </td>
                  ))}
                  <td className="px-5 py-4 sm:px-10 text-right">
                    <button className="text-brand-500 hover:underline text-sm font-medium mr-3">Edit</button>
                    <button className="text-red-500 hover:underline text-sm font-medium">Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="px-5 py-4 sm:px-10 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
           <p className="text-sm text-gray-500 dark:text-gray-400">Menampilkan 5 dari 50 data</p>
           <div className="flex gap-2">
              <button className="px-3 py-1 border border-gray-200 rounded text-sm disabled:opacity-50">Prev</button>
              <button className="px-3 py-1 border border-gray-200 rounded text-sm bg-brand-50 text-brand-500 border-brand-500">1</button>
              <button className="px-3 py-1 border border-gray-200 rounded text-sm">2</button>
              <button className="px-3 py-1 border border-gray-200 rounded text-sm">Next</button>
           </div>
        </div>
      </div>
    </div>
  );
}
