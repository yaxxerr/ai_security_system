import { useEffect, useState } from "react";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import axios from "axios";

interface Report {
  id: number;
  summary: string;
  created_at: string;
  period_start: string;
  period_end: string;
}

const API_URL = "http://localhost:8000/api";

export default function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await axios.get(`${API_URL}/reports/`);
      setReports(response.data);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateDailyReport = async () => {
    try {
      await axios.post(`${API_URL}/reports/generate_daily/`);
      fetchReports();
    } catch (error) {
      console.error("Error generating report:", error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Reports</h2>
        <Button
          label="Generate Daily Report"
          icon="pi pi-file"
          onClick={generateDailyReport}
          className="p-button-primary"
        />
      </div>

      {loading ? (
        <div className="text-center p-6">
          <i className="pi pi-spin pi-spinner text-4xl"></i>
        </div>
      ) : reports.length === 0 ? (
        <Card className="text-center">
          <i className="pi pi-file text-gray-400 text-5xl mb-4"></i>
          <h3 className="text-xl mb-2">No Reports Yet</h3>
          <p className="text-gray-600 mb-4">Generate a daily report to see summary data.</p>
          <Button
            label="Generate First Report"
            icon="pi pi-file"
            onClick={generateDailyReport}
            className="p-button-primary"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reports.map((report) => (
            <Card key={report.id} title={`Report #${report.id}`}>
              <div className="mb-4">
                <p className="text-gray-700 mb-4">{report.summary}</p>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>
                    From: {new Date(report.period_start).toLocaleDateString()}
                  </span>
                  <span>
                    To: {new Date(report.period_end).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-4 border-t pt-2">
                Created: {new Date(report.created_at).toLocaleString()}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

