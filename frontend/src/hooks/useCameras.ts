import { useEffect, useState } from 'react';

export interface CameraItem {
  id: number;
  name: string;
  location?: string;
  ip_address?: string;
  is_active?: boolean;
  last_checked?: string | null;
}

const STORAGE_KEY = 'saved_cameras_v1';

function readStorage(): CameraItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch (e) {
    console.warn('Failed to read cameras from storage', e);
    return [];
  }
}

function writeStorage(items: CameraItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('Failed to write cameras to storage', e);
  }
}

export default function useCameras() {
  const [cameras, setCameras] = useState<CameraItem[]>([]);

  useEffect(() => {
    setCameras(readStorage());
  }, []);

  useEffect(() => {
    writeStorage(cameras);
  }, [cameras]);

  function addCamera(cam: Omit<CameraItem, 'id'>) {
    const newCam: CameraItem = { ...cam, id: Date.now() };
    setCameras((s) => [newCam, ...s]);
    return newCam;
  }

  function updateCamera(id: number, patch: Partial<CameraItem>) {
    setCameras((s) => s.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function removeCamera(id: number) {
    setCameras((s) => s.filter((c) => c.id !== id));
  }

  function setActive(id: number | null) {
    setCameras((s) => s.map((c) => ({ ...c, is_active: c.id === id })));
  }

  function getActive() {
    return cameras.find((c) => c.is_active);
  }

  return {
    cameras,
    addCamera,
    updateCamera,
    removeCamera,
    setActive,
    getActive,
  } as const;
}
