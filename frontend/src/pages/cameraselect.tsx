import { useEffect, useState } from "react";
import { Card } from "primereact/card";
import { InputSwitch } from "primereact/inputswitch";
import axios from "axios";

interface Camera {
  id: number;
  name: string;
  location: string;
  ip_address: string;
  is_active: boolean;
  last_checked: string | null;
}

const API_URL = "http://localhost:8000/api";

export default function CameraSelect() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCameras();
  }, []);

  const fetchCameras = async () => {
    try {
      const response = await axios.get(`${API_URL}/cameras/`);
      setCameras(response.data);
    } catch (error) {
      console.error("Error fetching cameras:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCameraStatus = async (camera: Camera) => {
    try {
      await axios.patch(`${API_URL}/cameras/${camera.id}/`, {
        is_active: !camera.is_active,
      });
      fetchCameras();
    } catch (error) {
      console.error("Error updating camera:", error);
    }
  };

  const activeCount = cameras.filter((c) => c.is_active).length;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Camera Management</h2>
        <p className="text-gray-600">
          {activeCount} of {cameras.length} cameras active
        </p>
      </div>

      {loading ? (
        <div className="text-center p-6">
          <i className="pi pi-spin pi-spinner text-4xl"></i>
        </div>
      ) : cameras.length === 0 ? (
        <Card className="text-center">
          <i className="pi pi-video text-gray-400 text-5xl mb-4"></i>
          <h3 className="text-xl mb-2">No Cameras</h3>
          <p className="text-gray-600">Add cameras through the admin panel.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cameras.map((camera) => (
            <Card key={camera.id} title={camera.name}>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Location</p>
                  <p className="font-semibold">{camera.location}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">IP Address</p>
                  <p className="font-mono text-sm">{camera.ip_address}</p>
                </div>
                <div className="flex items-center justify-between pt-3 border-t">
                  <span className="text-sm font-medium">Status:</span>
                  <InputSwitch
                    checked={camera.is_active}
                    onChange={() => toggleCameraStatus(camera)}
                  />
                </div>
                {camera.last_checked && (
                  <div className="text-xs text-gray-400">
                    Last checked: {new Date(camera.last_checked).toLocaleString()}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

