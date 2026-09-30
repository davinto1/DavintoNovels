import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { formatNaira } from "@/lib/format";
import { adminListPackages, adminSavePackage } from "@/lib/server/admin";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/admin/coins")({ component: AdminCoins });

function AdminCoins() {
  const { user } = useCurrentUserState();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["pkgs"], queryFn: () => adminListPackages(), enabled: !!user });
  const [name, setName] = useState("");
  const [price, setPrice] = useState("500");
  const [coins, setCoins] = useState("500");
  const [bonus, setBonus] = useState("0");
  const save = useMutation({
    mutationFn: (d: Parameters<typeof adminSavePackage>[0]["data"]) => adminSavePackage({ data: d }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pkgs"] }),
  });
  return (
    <AdminShell>
      <h1 className="font-display text-3xl tracking-tight">Coin packages</h1>
      <ul className="mt-4 divide-y divide-border">
        {(q.data ?? []).map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
            <span>
              {p.name} · {formatNaira(p.price_kobo)} → {p.coins}+{p.bonus_coins} coins
            </span>
            <button
              type="button"
              className="text-xs text-muted"
              onClick={() =>
                save.mutate({
                  id: p.id,
                  name: p.name,
                  priceKobo: p.price_kobo,
                  coins: p.coins,
                  bonusCoins: p.bonus_coins,
                  active: !p.active,
                  sortOrder: p.sort_order,
                })
              }
            >
              {p.active ? "Deactivate" : "Activate"}
            </button>
          </li>
        ))}
      </ul>
      <h2 className="mt-8 font-display text-xl">New package</h2>
      <form
        className="mt-3 grid max-w-md gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate({
            name,
            priceKobo: Math.round(Number(price) * 100),
            coins: Number(coins),
            bonusCoins: Number(bonus),
            active: true,
            sortOrder: 20,
          });
        }}
      >
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <Label>Price (naira)</Label>
          <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div>
          <Label>Coins</Label>
          <Input type="number" value={coins} onChange={(e) => setCoins(e.target.value)} />
        </div>
        <div>
          <Label>Bonus coins</Label>
          <Input type="number" value={bonus} onChange={(e) => setBonus(e.target.value)} />
        </div>
        <Button type="submit">Save package</Button>
      </form>
    </AdminShell>
  );
}
