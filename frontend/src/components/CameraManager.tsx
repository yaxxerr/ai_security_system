import { useEffect, useState } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputSwitch } from 'primereact/inputswitch';
import { Dialog } from 'primereact/dialog';
import useCameras, { CameraItem } from '../hooks/useCameras';
import CameraView from './CameraView';
import axios from 'axios';

export default function CameraManager() {
  const local = useCameras();

  const API_URL = 'http://localhost:8000/api';

  const [serverAvailable, setServerAvailable] = useState<boolean | null>(null);
  const [serverCameras, setServerCameras] = useState<CameraItem[]>([]);

  const [editing, setEditing] = useState<CameraItem | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  const [form, setForm] = useState({ name: '', location: '', ip_address: '', is_active: false });

  useEffect(() => {
    let mounted = true;
    axios
      .get(`${API_URL}/cameras/`)
      .then((res) => {
        if (!mounted) return;
        setServerCameras(res.data || []);
        setServerAvailable(true);
      })
      .catch(() => {
        if (!mounted) return;
        setServerAvailable(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Helpers to decide which source to use
  const cameras = serverAvailable ? serverCameras : local.cameras;

  function startAdd() {
    setEditing(null);
    setForm({ name: '', location: '', ip_address: '', is_active: false });
    setShowDialog(true);
  }

  function startEdit(cam: CameraItem) {
    setEditing(cam);
    setForm({ name: cam.name || '', location: cam.location || '', ip_address: cam.ip_address || '', is_active: !!cam.is_active });
    setShowDialog(true);
  }

  async function removeCamera(id: number) {
    if (serverAvailable) {
      try {
        await axios.delete(`${API_URL}/cameras/${id}/`);
        const res = await axios.get(`${API_URL}/cameras/`);
        setServerCameras(res.data || []);
      } catch (e) {
        console.error('Server delete failed', e);
      }
    } else {
      local.removeCamera(id);
    }
  }

  async function setActive(id: number | null) {
    if (serverAvailable) {
      try {
        // update all cameras on server to set is_active correctly
        await Promise.all(
          serverCameras.map((c) =>
            axios.patch(`${API_URL}/cameras/${c.id}/`, { is_active: id !== null && c.id === id })
          )
        );
        const res = await axios.get(`${API_URL}/cameras/`);
        setServerCameras(res.data || []);
      } catch (e) {
        console.error('Server setActive failed', e);
      }
    } else {
      local.setActive(id as number | null);
    }
  }

  async function save() {
    if (!form.name.trim()) return;
    if (serverAvailable) {
      try {
        if (editing) {
          await axios.patch(`${API_URL}/cameras/${editing.id}/`, {
            name: form.name,
            location: form.location,
            ip_address: form.ip_address,
            is_active: form.is_active,
          });
          const res = await axios.get(`${API_URL}/cameras/`);
          setServerCameras(res.data || []);
        } else {
          await axios.post(`${API_URL}/cameras/`, {
            name: form.name,
            location: form.location,
            ip_address: form.ip_address,
            is_active: form.is_active,
          });
          const res = await axios.get(`${API_URL}/cameras/`);
          setServerCameras(res.data || []);
        }
      } catch (e) {
        console.error('Server save failed', e);
      }
    } else {
      if (editing) {
        local.updateCamera(editing.id, { ...form });
      } else {
        const c = local.addCamera({ ...form });
        if (form.is_active) local.setActive(c.id);
      }
    }

    setEditing(null);
    setForm({ name: '', location: '', ip_address: '', is_active: false });
    setShowDialog(false);
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">Camera Management</h2>
          <p className="text-gray-600">
            {serverAvailable === null
              ? 'Checking server availability...'
              : serverAvailable
              ? 'Connected to backend cameras (server-synced).'
              : 'Using local browser storage for cameras.'}
          </p>
        </div>
        <div>
          <Button label="Add Camera" icon="pi pi-plus" onClick={startAdd} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cameras.map((cam) => (
          <Card key={cam.id} title={cam.name} className="relative">
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Location</p>
                <div className="font-semibold">{cam.location || '-'}</div>
              </div>
              <div>
                <p className="text-sm text-gray-600">IP</p>
                <div className="font-mono text-sm">{cam.ip_address || '-'}</div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t">
                <span className="text-sm font-medium">Active</span>
                <InputSwitch checked={!!cam.is_active} onChange={() => setActive(cam.id)} />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button label="Preview" icon="pi pi-eye" onClick={() => { setShowPreview(true); setEditing(cam); }} />
                <Button label="Edit" icon="pi pi-pencil" onClick={() => startEdit(cam)} className="p-button-warning" />
                <Button label="Remove" icon="pi pi-trash" onClick={() => removeCamera(cam.id)} className="p-button-danger" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog header={editing ? 'Edit Camera' : 'Add Camera'} visible={showDialog} onHide={() => { setEditing(null); setForm({ name: '', location: '', ip_address: '', is_active: false }); setShowDialog(false); }} modal>
        <div className="p-4 space-y-3">
          <label className="block text-sm font-medium">Name</label>
          <InputText value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full" />

          <label className="block text-sm font-medium">Location</label>
          <InputText value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full" />

          <label className="block text-sm font-medium">IP Address</label>
          <InputText value={form.ip_address} onChange={(e) => setForm({ ...form, ip_address: e.target.value })} className="w-full" />

          <div className="flex items-center gap-3">
            <InputSwitch checked={form.is_active} onChange={() => setForm((s) => ({ ...s, is_active: !s.is_active }))} />
            <span className="text-sm">Set active</span>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <Button label="Cancel" icon="pi pi-times" onClick={() => { setEditing(null); setForm({ name: '', location: '', ip_address: '', is_active: false }); setShowDialog(false); }} className="p-button-secondary" />
            <Button label="Save" icon="pi pi-check" onClick={save} />
          </div>
        </div>
      </Dialog>

      {editing && (
        <CameraView
          visible={showPreview}
          onHide={() => { setShowPreview(false); setEditing(null); }}
          cameraId={undefined}
          cameraName={editing.name}
          cameraIp={editing.ip_address}
        />
      )}
    </div>
  );
}
