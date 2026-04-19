import { useState } from 'react';
import { Plus, Trash2, Download } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { createPortfolio, savePortfolioToLocalStorage, getPortfoliosFromLocalStorage, deletePortfolio, exportPortfolioAsJSON, HoldingAsset } from '../utils/portfolioFilters';

interface PortfolioManagerProps {
  currentPortfolio?: HoldingAsset[];
  onPortfolioSelect?: (portfolio: HoldingAsset[]) => void;
}

export function PortfolioManager({ currentPortfolio = [], onPortfolioSelect }: PortfolioManagerProps) {
  const [portfolios, setPortfolios] = useState(getPortfoliosFromLocalStorage());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [portfolioName, setPortfolioName] = useState('');
  const [portfolioDesc, setPortfolioDesc] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleCreatePortfolio = () => {
    if (!portfolioName.trim()) {
      alert('Please enter a portfolio name');
      return;
    }

    const newPortfolio = createPortfolio(portfolioName, portfolioDesc, currentPortfolio);
    savePortfolioToLocalStorage(newPortfolio);
    setPortfolios([...portfolios, newPortfolio]);
    setPortfolioName('');
    setPortfolioDesc('');
    setShowCreateForm(false);
  };

  const handleDeletePortfolio = (id: string) => {
    if (confirm('Are you sure you want to delete this portfolio?')) {
      deletePortfolio(id);
      setPortfolios(portfolios.filter((p) => p.id !== id));
      if (selectedId === id) setSelectedId(null);
    }
  };

  const handleSelectPortfolio = (id: string) => {
    const portfolio = portfolios.find((p) => p.id === id);
    if (portfolio) {
      setSelectedId(id);
      onPortfolioSelect?.(portfolio.assets);
    }
  };

  return (
    <div className="w-full space-y-4">
      <Card className="p-6 bg-zinc-950 border border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-zinc-100">Saved Portfolios</h3>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-zinc-700 hover:bg-zinc-600 text-zinc-100 py-2 rounded-lg font-medium text-sm"
          >
            <Plus size={16} className="mr-2" />
            New Portfolio
          </Button>
        </div>

        {showCreateForm && (
          <div className="mb-4 p-4 bg-zinc-900 border border-zinc-700 rounded-lg space-y-3">
            <input
              type="text"
              value={portfolioName}
              onChange={(e) => setPortfolioName(e.target.value)}
              placeholder="Portfolio name"
              className="w-full p-2 bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-lg text-sm"
            />
            <textarea
              value={portfolioDesc}
              onChange={(e) => setPortfolioDesc(e.target.value)}
              placeholder="Description (optional)"
              className="w-full p-2 bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-lg text-sm"
              rows={2}
            />
            <div className="flex gap-2">
              <Button
                onClick={handleCreatePortfolio}
                className="flex-1 bg-green-700 hover:bg-green-600 text-white py-2 rounded-lg font-medium text-sm"
              >
                Save Portfolio
              </Button>
              <Button
                onClick={() => setShowCreateForm(false)}
                className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 py-2 rounded-lg font-medium text-sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {portfolios.length === 0 ? (
          <p className="text-zinc-400 text-sm text-center py-8">No saved portfolios yet</p>
        ) : (
          <div className="space-y-2">
            {portfolios.map((portfolio) => (
              <div
                key={portfolio.id}
                className={`p-3 rounded-lg border transition cursor-pointer ${
                  selectedId === portfolio.id
                    ? 'bg-zinc-800 border-zinc-600'
                    : 'bg-zinc-900 border-zinc-700 hover:bg-zinc-800'
                }`}
                onClick={() => handleSelectPortfolio(portfolio.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-zinc-100">{portfolio.name}</p>
                    <p className="text-xs text-zinc-400">{portfolio.description}</p>
                    <p className="text-xs text-zinc-500 mt-1">{portfolio.assets.length} assets</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportPortfolioAsJSON(portfolio);
                      }}
                      className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 rounded"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePortfolio(portfolio.id);
                      }}
                      className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
