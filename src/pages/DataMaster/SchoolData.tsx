import { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import { SearchIcon } from "../../icons";
import SchoolTable from "../../components/school/SchoolTable";
import { dapodikService } from "../../services/dapodikService";

export default function SchoolData() {
  const [searchQuery, setSearchQuery] = useState("");
  const [kabKotaFilter, setKabKotaFilter] = useState("all");
  const [kecamatanFilter, setKecamatanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [jenjangFilter, setJenjangFilter] = useState("all");
  
  const [kabKotaOptions, setKabKotaOptions] = useState([{ value: "all", label: "Kab/Kota" }]);
  const [kecamatanOptions, setKecamatanOptions] = useState([{ value: "all", label: "Kecamatan" }]);
  const [statusOptions, setStatusOptions] = useState([{ value: "all", label: "Status" }]);
  const [jenjangOptions, setJenjangOptions] = useState([{ value: "all", label: "Jenjang" }]);
  const [allSchools, setAllSchools] = useState<any[]>([]);

  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        const response = await dapodikService.getSekolah();
        let schools = [];
        if (response.status === 'success' || response.success === true) {
          schools = response.data || [];
        } else if (Array.isArray(response)) {
          schools = response;
        } else if (response.data && Array.isArray(response.data)) {
          schools = response.data;
        }

        if (schools.length > 0) {
          setAllSchools(schools);
          
          const uniqueKab = [...new Set(schools.map((s: any) => s.kabupaten_kota || s.kabupate_kota))].filter(Boolean).sort();
          setKabKotaOptions([{ value: "all", label: "Kab/Kota" }, ...uniqueKab.map(k => ({ value: k, label: k }))]);

          const uniqueStatus = [...new Set(schools.map((s: any) => s.status_sekolah))].filter(Boolean).sort();
          setStatusOptions([{ value: "all", label: "Status" }, ...uniqueStatus.map(s => ({ value: s, label: s }))]);

          const uniqueJenjang = [...new Set(schools.map((s: any) => s.bentuk_pendidikan_id_str || s.bentuk_pendidikan_is_str))].filter(Boolean).sort();
          setJenjangOptions([{ value: "all", label: "Jenjang" }, ...uniqueJenjang.map(j => ({ value: j, label: j }))]);
        }
      } catch (err) {
        console.error("Gagal memuat filter:", err);
      }
    };
    fetchFilterData();
  }, []);

  // Filter Kecamatan based on Kab/Kota
  useEffect(() => {
    if (kabKotaFilter === "all") {
        setKecamatanOptions([{ value: "all", label: "Kecamatan" }]);
        setKecamatanFilter("all");
    } else {
        const filteredKec = [...new Set(allSchools
            .filter(s => (s.kabupaten_kota || s.kabupate_kota) === kabKotaFilter)
            .map(s => s.kecamatan)
        )].filter(Boolean).sort();
        setKecamatanOptions([{ value: "all", label: "Kecamatan" }, ...filteredKec.map(k => ({ value: k, label: k }))]);
    }
  }, [kabKotaFilter, allSchools]);

  return (
    <>
      <PageMeta
        title="Satuan Pendidikan | SIMAK Admin Panel"
        description="Data Satuan Pendidikan Mandala"
      />
      <div className="space-y-6">
        {/* Header Section */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 no-print">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Data Satuan Pendidikan
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Daftar seluruh sekolah yang terhubung di bawah sistem Mandala.
          </p>
        </div>

        {/* Global Filters Section - Following GTKData layout */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 no-print">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Select
                    options={kabKotaOptions}
                    defaultValue={kabKotaFilter}
                    onChange={(value) => setKabKotaFilter(value)}
                />
                <Select
                    options={kecamatanOptions}
                    defaultValue={kecamatanFilter}
                    onChange={(value) => setKecamatanFilter(value)}
                    disabled={kabKotaFilter === "all"}
                />
                <Select
                    options={statusOptions}
                    defaultValue={statusFilter}
                    onChange={(value) => setStatusFilter(value)}
                />
                <Select
                    options={jenjangOptions}
                    defaultValue={jenjangFilter}
                    onChange={(value) => setJenjangFilter(value)}
                />
            </div>
        </div>

        {/* Table Section */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-end no-print">
            <div className="relative max-w-sm w-full">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <SearchIcon className="size-5" />
              </span>
              <Input
                type="text"
                placeholder="Cari sekolah atau NPSN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <SchoolTable 
            searchTerm={searchQuery}
            kabKotaFilter={kabKotaFilter}
            kecamatanFilter={kecamatanFilter}
            statusFilter={statusFilter}
            jenjangFilter={jenjangFilter}
          />
        </div>
      </div>
    </>
  );
}
