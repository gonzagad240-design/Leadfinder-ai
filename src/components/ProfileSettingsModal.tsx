import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Link2,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { User } from '../types';

const DEFAULT_AVATAR_URL =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

export interface ProfileUpdatePayload {
  avatar: string;
  name: string;
  phone: string;
}

interface ProfileEditorBodyProps {
  currentUser: User;
  onSaveProfile: (updates: ProfileUpdatePayload) => Promise<{ error?: string }>;
  onClose?: () => void;
  compact?: boolean;
}

async function resizeImageFileToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Selecione um ficheiro de imagem válido (PNG, JPG, WebP ou GIF).');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('A imagem excede o limite de 5MB. Escolha uma imagem mais leve.');
  }

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Falha ao ler a imagem selecionada.'));
    reader.readAsDataURL(file);
  });

  // Preserve GIF/SVG animations directly if small enough
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
    return rawDataUrl;
  }

  return await new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 320;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(rawDataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      resolve(canvas.toDataURL(outType, 0.88));
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}

export const ProfileAvatarEditor: React.FC<ProfileEditorBodyProps> = ({
  currentUser,
  onSaveProfile,
  onClose,
  compact = false,
}) => {
  const initialAvatar = currentUser.avatar || DEFAULT_AVATAR_URL;
  const [previewAvatar, setPreviewAvatar] = useState<string>(initialAvatar);
  const [urlInput, setUrlInput] = useState<string>(
    initialAvatar.startsWith('data:image/') ? '' : initialAvatar
  );
  const [nameInput, setNameInput] = useState<string>(currentUser.name || '');
  const [phoneInput, setPhoneInput] = useState<string>(currentUser.phone || '');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const nextAvatar = currentUser.avatar || DEFAULT_AVATAR_URL;
    setPreviewAvatar(nextAvatar);
    setUrlInput(nextAvatar.startsWith('data:image/') ? '' : nextAvatar);
    setNameInput(currentUser.name || '');
    setPhoneInput(currentUser.phone || '');
    setUploadedFileName(null);
    setImageLoadError(false);
  }, [currentUser.id, currentUser.avatar, currentUser.name, currentUser.phone]);

  const handleUrlChange = (value: string) => {
    setUrlInput(value);
    setErrorMsg(null);
    setSuccessMsg(null);
    setUploadedFileName(null);
    setImageLoadError(false);
    if (value.trim()) {
      setPreviewAvatar(value.trim());
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setImageLoadError(false);
    setIsProcessingFile(true);

    try {
      const dataUrl = await resizeImageFileToDataUrl(file);
      setPreviewAvatar(dataUrl);
      setUrlInput('');
      setUploadedFileName(file.name);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Não foi possível processar a imagem.');
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleResetDefault = () => {
    setPreviewAvatar(DEFAULT_AVATAR_URL);
    setUrlInput(DEFAULT_AVATAR_URL);
    setUploadedFileName(null);
    setImageLoadError(false);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const candidateAvatar = (previewAvatar || DEFAULT_AVATAR_URL).trim();
    const isHttp = /^https?:\/\/.+/i.test(candidateAvatar);
    const isData = /^data:image\/.+;base64,.+/i.test(candidateAvatar);

    if (!isHttp && !isData) {
      setErrorMsg('Insira um link de imagem válido (http:// ou https://) ou faça upload de um ficheiro.');
      return;
    }

    if (imageLoadError) {
      setErrorMsg('Não foi possível carregar a imagem deste link. Verifique o URL ou faça upload.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await onSaveProfile({
        avatar: candidateAvatar,
        name: nameInput.trim() || currentUser.name,
        phone: phoneInput.trim(),
      });
      if (res.error) {
        setErrorMsg(res.error);
        return;
      }
      setSuccessMsg('Foto e definições de perfil atualizadas no estado da aplicação e base de dados!');
      if (onClose) {
        setTimeout(() => {
          onClose();
        }, 900);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      {/* Live Avatar Preview + Quick Upload */}
      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-center gap-4">
        <div className="relative shrink-0">
          <img
            src={previewAvatar || DEFAULT_AVATAR_URL}
            alt={nameInput || currentUser.name}
            onLoad={() => setImageLoadError(false)}
            onError={() => setImageLoadError(true)}
            className={`w-20 h-20 rounded-full object-cover ring-2 ${
              imageLoadError
                ? 'ring-rose-500/60 opacity-50'
                : 'ring-blue-500/50'
            } bg-slate-900`}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Carregar foto do dispositivo"
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-blue-600 hover:bg-blue-500 text-white border-2 border-slate-950 flex items-center justify-center shadow-lg cursor-pointer transition-colors"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 min-w-0 text-center sm:text-left space-y-1.5">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className="font-bold text-sm text-white truncate">
              {nameInput || currentUser.name}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/15 text-blue-300 border border-blue-500/30">
              {currentUser.role}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 truncate font-mono">{currentUser.email}</p>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleFileSelected}
              className="hidden"
              aria-label="Fazer upload de foto de perfil"
            />
            <button
              type="button"
              disabled={isProcessingFile}
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-semibold flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
            >
              {isProcessingFile ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span>{isProcessingFile ? 'Processando...' : 'Fazer Upload'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetDefault}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium flex items-center gap-1 cursor-pointer transition-all"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Repor Padrão</span>
            </button>
          </div>

          {uploadedFileName && (
            <p className="text-[10px] text-emerald-400 font-medium">
              Imagem pronta para guardar: {uploadedFileName}
            </p>
          )}
          {!uploadedFileName && previewAvatar.startsWith('data:image/') && (
            <p className="text-[10px] text-emerald-400 font-medium">
              Foto personalizada carregada por upload.
            </p>
          )}
        </div>
      </div>

      {/* Image URL Input */}
      <div>
        <label className="block text-slate-300 font-semibold mb-1.5 flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5 text-blue-400" />
          <span>Link de Imagem (URL) para Foto de Perfil</span>
        </label>
        <input
          type="url"
          value={urlInput}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder="https://exemplo.com/minha-foto-perfil.jpg"
          className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono text-xs focus:outline-none focus:border-blue-500"
        />
        <p className="text-[10px] text-slate-500 mt-1">
          Cole um link direto (HTTPS) ou utilize o botão <strong>Fazer Upload</strong> acima.
        </p>
        {imageLoadError && (
          <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Não foi possível pré-visualizar este URL de imagem.</span>
          </p>
        )}
      </div>

      {/* Display Name & Phone */}
      {!compact && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Nome no Perfil</label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => {
                setNameInput(e.target.value);
                setSuccessMsg(null);
              }}
              placeholder="Seu nome completo"
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Telefone / WhatsApp</label>
            <input
              type="text"
              value={phoneInput}
              onChange={(e) => {
                setPhoneInput(e.target.value);
                setSuccessMsg(null);
              }}
              placeholder="(11) 99999-9999"
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
        <span className="text-[10px] text-slate-500 flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          Persistido em public.profiles &amp; estado global
        </span>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 font-semibold cursor-pointer"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={isSaving || isProcessingFile}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-xl font-bold shadow-lg shadow-blue-600/25 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span>{isSaving ? 'Guardando...' : 'Guardar Foto de Perfil'}</span>
          </button>
        </div>
      </div>
    </form>
  );
};

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onSaveProfile: (updates: ProfileUpdatePayload) => Promise<{ error?: string }>;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSaveProfile,
}) => {
  if (!isOpen || !currentUser) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Definições de Perfil &amp; Foto</h3>
              <p className="text-[11px] text-slate-400">
                Atualize sua imagem via URL ou upload direto do dispositivo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <ProfileAvatarEditor
          currentUser={currentUser}
          onSaveProfile={onSaveProfile}
          onClose={onClose}
        />
      </div>
    </div>
  );
};
