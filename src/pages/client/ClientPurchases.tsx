import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ClientLayout from "@/components/client/ClientLayout";
import { Receipt, Calendar, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Purchase {
  id: string;
  item_name: string;
  amount: number;
  purchase_date: string;
  payment_status: string;
  pass_id: string | null;
}

const ClientPurchases: React.FC = () => {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPurchases();
  }, []);

  const loadPurchases = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data } = await supabase
      .from("purchases")
      .select("*")
      .eq("user_id", user.id)
      .order("purchase_date", { ascending: false });

    if (data) setPurchases(data);
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      completed: { bg: "bg-green-500/20", text: "text-green-400", label: "Payé" },
      pending: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "En attente" },
      refunded: { bg: "bg-red-500/20", text: "text-red-400", label: "Remboursé" },
    };
    const style = styles[status] || { bg: "bg-muted", text: "text-muted-foreground", label: status };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  const totalSpent = purchases
    .filter(p => p.payment_status === "completed")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  if (loading) {
    return (
      <ClientLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl lg:text-4xl mb-2">Mes achats</h1>
          <p className="text-muted-foreground">
            Consultez l'historique de vos transactions
          </p>
        </div>

        {/* Summary card */}
        <div className="dashboard-card mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Total dépensé</p>
              <p className="text-4xl font-display text-gradient">{totalSpent.toFixed(2)} $</p>
            </div>
          </div>
        </div>

        {purchases.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground dashboard-card">
            <Receipt className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Aucun achat pour le moment</p>
          </div>
        ) : (
          <div className="dashboard-card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-muted-foreground text-sm border-b border-border">
                    <th className="pb-4 font-medium">Article</th>
                    <th className="pb-4 font-medium">Date</th>
                    <th className="pb-4 font-medium">Montant</th>
                    <th className="pb-4 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((purchase) => (
                    <tr key={purchase.id} className="border-b border-border/50 last:border-0">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Receipt className="w-5 h-5 text-primary" />
                          </div>
                          <span className="font-medium">{purchase.item_name}</span>
                        </div>
                      </td>
                      <td className="py-4 text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(purchase.purchase_date), "d MMM yyyy", {
                            locale: fr,
                          })}
                        </div>
                      </td>
                      <td className="py-4 font-medium">{Number(purchase.amount).toFixed(2)} $</td>
                      <td className="py-4">{getStatusBadge(purchase.payment_status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </ClientLayout>
  );
};

export default ClientPurchases;
