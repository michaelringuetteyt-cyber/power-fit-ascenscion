import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { 
  Image, 
  Upload, 
  Trash2, 
  Save, 
  Plus,
  Loader2,
  CheckCircle
} from "lucide-react";
import { toast } from "sonner";

interface ContentItem {
  id: string;
  section: string;
  content_key: string;
  content_type: string;
  content_value: string;
  updated_at: string;
}

const SECTIONS = [
  { id: "hero", label: "Hero / Accueil" },
  { id: "gallery", label: "Galerie" },
  { id: "about", label: "À propos" },
  { id: "services", label: "Services" },
  { id: "contact", label: "Contact" },
];

const AdminContentPage = () => {
  const [activeSection, setActiveSection] = useState("gallery");
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadContent();
  }, [activeSection]);

  const loadContent = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("site_content")
      .select("*")
      .eq("section", activeSection)
      .order("content_key");

    if (data) {
      setContent(data);
    }
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image");
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${activeSection}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("site-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("site-images")
        .getPublicUrl(fileName);

      // Save to content table
      await supabase.from("site_content").insert({
        section: activeSection,
        content_key: `image_${Date.now()}`,
        content_type: "image",
        content_value: publicUrl,
      });

      toast.success("Image uploadée avec succès");
      loadContent();
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (item: ContentItem) => {
    if (!confirm("Supprimer cette image ?")) return;

    try {
      // Extract file path from URL
      const urlParts = item.content_value.split("/site-images/");
      if (urlParts[1]) {
        await supabase.storage
          .from("site-images")
          .remove([urlParts[1]]);
      }

      await supabase.from("site_content").delete().eq("id", item.id);
      
      toast.success("Image supprimée");
      loadContent();
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    }
  };

  const handleTextUpdate = async (item: ContentItem, newValue: string) => {
    setSaving(item.id);
    try {
      await supabase
        .from("site_content")
        .update({ content_value: newValue })
        .eq("id", item.id);

      toast.success("Contenu mis à jour");
      loadContent();
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setSaving(null);
    }
  };

  const handleAddText = async () => {
    const key = prompt("Nom du contenu (ex: titre, description):");
    if (!key) return;

    const value = prompt("Valeur du contenu:");
    if (!value) return;

    try {
      await supabase.from("site_content").insert({
        section: activeSection,
        content_key: key.toLowerCase().replace(/\s+/g, "_"),
        content_type: "text",
        content_value: value,
      });

      toast.success("Contenu ajouté");
      loadContent();
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    }
  };

  const images = content.filter((c) => c.content_type === "image");
  const texts = content.filter((c) => c.content_type === "text");

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl lg:text-4xl mb-2">
            Gestion du contenu
          </h1>
          <p className="text-muted-foreground">
            Modifier les images et textes de votre site
          </p>
        </div>

        {/* Section Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeSection === section.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Images Section */}
            <div className="dashboard-card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl flex items-center gap-2">
                  <Image className="w-5 h-5 text-primary" />
                  Images - {SECTIONS.find(s => s.id === activeSection)?.label}
                </h2>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button variant="hero" disabled={uploading} asChild>
                    <span>
                      {uploading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      Ajouter une image
                    </span>
                  </Button>
                </label>
              </div>

              {images.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Image className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Aucune image pour cette section</p>
                  <p className="text-sm">Uploadez votre première image</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {images.map((item) => (
                    <div
                      key={item.id}
                      className="relative group aspect-square rounded-lg overflow-hidden bg-muted"
                    >
                      <img
                        src={item.content_value}
                        alt={item.content_key}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(item)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Supprimer
                        </Button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-background to-transparent">
                        <p className="text-xs truncate">{item.content_key}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Text Content Section */}
            <div className="dashboard-card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl">Textes</h2>
                <Button variant="outline" onClick={handleAddText}>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un texte
                </Button>
              </div>

              {texts.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  Aucun contenu texte pour cette section
                </p>
              ) : (
                <div className="space-y-4">
                  {texts.map((item) => (
                    <div key={item.id} className="flex gap-4 items-start">
                      <div className="flex-1">
                        <label className="text-sm font-medium mb-2 block capitalize">
                          {item.content_key.replace(/_/g, " ")}
                        </label>
                        <textarea
                          defaultValue={item.content_value}
                          rows={2}
                          className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:border-primary text-sm resize-none"
                          onBlur={(e) => {
                            if (e.target.value !== item.content_value) {
                              handleTextUpdate(item, e.target.value);
                            }
                          }}
                        />
                      </div>
                      <div className="flex gap-2 pt-7">
                        {saving === item.id ? (
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-green-500 opacity-50" />
                        )}
                        <button
                          onClick={() => handleDelete(item)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminContentPage;
