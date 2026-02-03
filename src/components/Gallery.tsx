import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import heroCommunity from "@/assets/hero-community.png";
import galleryCommunity from "@/assets/gallery-community.png";

interface GalleryItem {
  id: string;
  category: string;
  image: string;
  title: string;
}

const Gallery = () => {
  const [activeFilter, setActiveFilter] = useState("all");
  const [dynamicItems, setDynamicItems] = useState<GalleryItem[]>([]);

  const filters = [
    { id: "all", label: "Tous" },
    { id: "training", label: "Entraînement" },
    { id: "community", label: "Communauté" },
    { id: "results", label: "Résultats" },
    { id: "trainers", label: "Entraîneurs" },
  ];

  // Default gallery items
  const defaultItems: GalleryItem[] = [
    { id: "default-1", category: "community", image: heroCommunity, title: "La famille Power Fit" },
    { id: "default-2", category: "community", image: galleryCommunity, title: "Engagement & Motivation" },
  ];

  useEffect(() => {
    loadGalleryImages();
  }, []);

  const loadGalleryImages = async () => {
    const { data } = await supabase
      .from("site_content")
      .select("*")
      .eq("section", "gallery")
      .eq("content_type", "image")
      .order("created_at", { ascending: false });

    if (data) {
      const items: GalleryItem[] = data.map((item) => {
        // Extract category from content_key (format: image_category_timestamp)
        const parts = item.content_key.split("_");
        const category = parts.length >= 3 ? parts[1] : "training";
        
        return {
          id: item.id,
          category,
          image: item.content_value,
          title: getCategoryLabel(category),
        };
      });
      setDynamicItems(items);
    }
  };

  const getCategoryLabel = (category: string): string => {
    switch (category) {
      case "training": return "Entraînement";
      case "community": return "Communauté";
      case "results": return "Résultats";
      case "trainers": return "Entraîneurs";
      default: return "Galerie";
    }
  };

  // Combine default and dynamic items
  const allItems = [...defaultItems, ...dynamicItems];

  const filteredItems = activeFilter === "all" 
    ? allItems 
    : allItems.filter(item => item.category === activeFilter);

  return (
    <section id="gallery" className="py-24 relative perspective-container">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-block px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium uppercase tracking-wider mb-4 glass-3d">
            Notre Communauté
          </div>
          <h2 className="font-display text-4xl md:text-6xl mb-4 tracking-wider text-3d">
            GALERIE DE <span className="text-gradient">TRANSFORMATION</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Découvrez notre communauté engagée et leurs résultats
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                activeFilter === filter.id
                  ? "bg-primary text-primary-foreground neon-glow"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Gallery Grid with 3D */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg">Aucune image dans cette catégorie</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filteredItems.map((item, index) => (
              <div
                key={item.id}
                className={`relative aspect-square rounded-xl overflow-hidden group cursor-pointer card-3d ${
                  index === 0 ? "col-span-2 row-span-2" : ""
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Title */}
                <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <h3 className="font-display text-xl tracking-wide">{item.title}</h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Gallery;