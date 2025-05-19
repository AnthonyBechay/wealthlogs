import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import { api } from "@wealthlog/common";

interface RealEstateProperty {
  id: number;
  name: string;
  address: string;
  type: string;
  purchasePrice: number;
  currentValue: number;
  purchaseDate: string;
  status: string;
  rentAmount?: number;
  mortgageBalance?: number;
}

interface PropertyExpense {
  id: number;
  propertyId: number;
  type: string;
  amount: number;
  description: string;
  date: string;
}

export default function RealEstatePage() {
  const router = useRouter();
  
  // State
  const [properties, setProperties] = useState<RealEstateProperty[]>([]);
  const [expenses, setExpenses] = useState<PropertyExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<number | null>(null);
  
  // Forms
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<RealEstateProperty | null>(null);

  // Property form
  const [propertyForm, setPropertyForm] = useState({
    name: "",
    address: "",
    type: "HOUSE",
    purchasePrice: "",
    currentValue: "",
    purchaseDate: "",
    status: "OWNED",
    rentAmount: "",
    mortgageBalance: ""
  });

  // Expense form
  const [expenseForm, setExpenseForm] = useState({
    propertyId: "",
    type: "MAINTENANCE",
    amount: "",
    description: "",
    date: new Date().toISOString().slice(0, 10)
  });

  // Summary calculations
  const summary = useMemo(() => {
    const totalValue = properties.reduce((sum, p) => sum + p.currentValue, 0);
    const totalCost = properties.reduce((sum, p) => sum + p.purchasePrice, 0);
    const totalMortgage = properties.reduce((sum, p) => sum + (p.mortgageBalance || 0), 0);
    const totalRent = properties.reduce((sum, p) => sum + (p.rentAmount || 0), 0);
    const totalGain = totalValue - totalCost;
    const gainPercentage = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

    return { totalValue, totalCost, totalMortgage, totalRent, totalGain, gainPercentage };
  }, [properties]);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await api.get("/auth/me");
      
      // Try to load properties, fallback to empty array if endpoints don't exist
      try {
        const propertiesRes = await api.get<RealEstateProperty[]>("/real-estate/properties");
        setProperties(propertiesRes.data || []);
      } catch (propertiesError) {
        console.warn("Real estate properties endpoint not available:", propertiesError);
        setProperties([]);
      }

      // Try to load expenses, fallback to empty array if endpoints don't exist
      try {
        const expensesRes = await api.get<PropertyExpense[]>("/real-estate/expenses");
        setExpenses(expensesRes.data || []);
      } catch (expensesError) {
        console.warn("Real estate expenses endpoint not available:", expensesError);
        setExpenses([]);
      }
    } catch (error) {
      console.error("Failed to authenticate:", error);
      if (error.response?.status === 401) {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  // Property handlers
  const openPropertyForm = (property?: RealEstateProperty) => {
    if (property) {
      setEditingProperty(property);
      setPropertyForm({
        name: property.name,
        address: property.address,
        type: property.type,
        purchasePrice: property.purchasePrice.toString(),
        currentValue: property.currentValue.toString(),
        purchaseDate: property.purchaseDate,
        status: property.status,
        rentAmount: property.rentAmount?.toString() || "",
        mortgageBalance: property.mortgageBalance?.toString() || ""
      });
    } else {
      setEditingProperty(null);
      setPropertyForm({
        name: "",
        address: "",
        type: "HOUSE",
        purchasePrice: "",
        currentValue: "",
        purchaseDate: "",
        status: "OWNED",
        rentAmount: "",
        mortgageBalance: ""
      });
    }
    setShowPropertyForm(true);
  };

  const handlePropertySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      name: propertyForm.name,
      address: propertyForm.address,
      type: propertyForm.type,
      purchasePrice: parseFloat(propertyForm.purchasePrice),
      currentValue: parseFloat(propertyForm.currentValue),
      purchaseDate: propertyForm.purchaseDate,
      status: propertyForm.status,
      rentAmount: propertyForm.rentAmount ? parseFloat(propertyForm.rentAmount) : null,
      mortgageBalance: propertyForm.mortgageBalance ? parseFloat(propertyForm.mortgageBalance) : null
    };

    try {
      if (editingProperty) {
        await api.put(`/real-estate/properties/${editingProperty.id}`, payload);
      } else {
        await api.post("/real-estate/properties", payload);
      }
      setShowPropertyForm(false);
      loadData();
    } catch (error) {
      console.error("Failed to save property:", error);
      if (error.response?.status === 404) {
        alert("Real estate feature not yet available. Backend endpoints required.");
      } else {
        alert("Failed to save property");
      }
    }
  };

  const deleteProperty = async (id: number) => {
    if (!confirm("Delete this property?")) return;
    
    try {
      await api.delete(`/real-estate/properties/${id}`);
      loadData();
      if (selectedProperty === id) setSelectedProperty(null);
    } catch (error) {
      console.error("Failed to delete property:", error);
      if (error.response?.status === 404) {
        alert("Real estate feature not yet available. Backend endpoints required.");
      } else {
        alert("Failed to delete property");
      }
    }
  };

  // Expense handlers
  const openExpenseForm = (propertyId?: number) => {
    setExpenseForm({
      propertyId: propertyId ? propertyId.toString() : "",
      type: "MAINTENANCE",
      amount: "",
      description: "",
      date: new Date().toISOString().slice(0, 10)
    });
    setShowExpenseForm(true);
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      propertyId: parseInt(expenseForm.propertyId),
      type: expenseForm.type,
      amount: parseFloat(expenseForm.amount),
      description: expenseForm.description,
      date: expenseForm.date
    };

    try {
      await api.post("/real-estate/expenses", payload);
      setShowExpenseForm(false);
      loadData();
    } catch (error) {
      console.error("Failed to add expense:", error);
      if (error.response?.status === 404) {
        alert("Real estate feature not yet available. Backend endpoints required.");
      } else {
        alert("Failed to add expense");
      }
    }
  };

  // Utils
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OWNED': return 'var(--success)';
      case 'RENTED': return 'var(--primary)';
      case 'VACANT': return 'var(--warning)';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--primary)' }}></div>
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen" style={{ backgroundColor: 'var(--background)', color: 'var(--text)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Real Estate</h1>
          <button
            onClick={() => openPropertyForm()}
            className="px-4 py-2 text-white rounded hover:opacity-90"
            style={{ backgroundColor: 'var(--success)' }}
          >
            Add Property
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded shadow" style={{ backgroundColor: 'var(--background-2)' }}>
            <div className="text-sm text-gray-600">Total Value</div>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalValue)}</div>
          </div>
          <div className="p-4 rounded shadow" style={{ backgroundColor: 'var(--background-2)' }}>
            <div className="text-sm text-gray-600">Total Gain/Loss</div>
            <div className={`text-2xl font-bold ${summary.totalGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(summary.totalGain)}
            </div>
            <div className={`text-sm ${summary.gainPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {summary.gainPercentage.toFixed(2)}%
            </div>
          </div>
          <div className="p-4 rounded shadow" style={{ backgroundColor: 'var(--background-2)' }}>
            <div className="text-sm text-gray-600">Monthly Rent</div>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalRent)}</div>
          </div>
          <div className="p-4 rounded shadow" style={{ backgroundColor: 'var(--background-2)' }}>
            <div className="text-sm text-gray-600">Total Mortgage</div>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalMortgage)}</div>
          </div>
        </div>

        {/* Properties Table */}
        <div className="p-4 rounded shadow mb-6" style={{ backgroundColor: 'var(--background-2)' }}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Properties ({properties.length})</h2>
            <button
              onClick={() => openExpenseForm()}
              className="px-3 py-1 text-white rounded text-sm hover:opacity-90"
              style={{ backgroundColor: 'var(--warning)' }}
            >
              Add Expense
            </button>
          </div>

          {properties.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-2">No properties yet.</p>
              <p className="text-sm mb-4">Backend endpoints required: <code>/real-estate/properties</code> and <code>/real-estate/expenses</code></p>
              <button
                onClick={() => openPropertyForm()}
                className="px-4 py-2 text-white rounded hover:opacity-90"
                style={{ backgroundColor: 'var(--success)' }}
              >
                Add Property (Demo)
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr style={{ backgroundColor: 'var(--background)' }}>
                    <th className="border p-3 text-left" style={{ borderColor: '#ddd' }}>Property</th>
                    <th className="border p-3 text-left" style={{ borderColor: '#ddd' }}>Type</th>
                    <th className="border p-3 text-center" style={{ borderColor: '#ddd' }}>Status</th>
                    <th className="border p-3 text-right" style={{ borderColor: '#ddd' }}>Value</th>
                    <th className="border p-3 text-right" style={{ borderColor: '#ddd' }}>Gain/Loss</th>
                    <th className="border p-3 text-right" style={{ borderColor: '#ddd' }}>Rent</th>
                    <th className="border p-3 text-center" style={{ borderColor: '#ddd' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {properties.map(property => {
                    const gain = property.currentValue - property.purchasePrice;
                    const gainPercent = (gain / property.purchasePrice) * 100;
                    
                    return (
                      <tr 
                        key={property.id}
                        className="hover:opacity-90 cursor-pointer"
                        onClick={() => setSelectedProperty(selectedProperty === property.id ? null : property.id)}
                        style={{ backgroundColor: selectedProperty === property.id ? 'var(--background-3)' : 'transparent' }}
                      >
                        <td className="border p-3" style={{ borderColor: '#ddd' }}>
                          <div className="font-medium">{property.name}</div>
                          <div className="text-sm text-gray-500">{property.address}</div>
                        </td>
                        <td className="border p-3" style={{ borderColor: '#ddd' }}>{property.type}</td>
                        <td className="border p-3 text-center" style={{ borderColor: '#ddd' }}>
                          <span 
                            className="px-2 py-1 rounded text-xs font-medium text-white"
                            style={{ backgroundColor: getStatusColor(property.status) }}
                          >
                            {property.status}
                          </span>
                        </td>
                        <td className="border p-3 text-right font-semibold" style={{ borderColor: '#ddd' }}>
                          {formatCurrency(property.currentValue)}
                        </td>
                        <td className="border p-3 text-right" style={{ borderColor: '#ddd' }}>
                          <div className={gain >= 0 ? 'text-green-600' : 'text-red-600'}>
                            <div className="font-semibold">{formatCurrency(gain)}</div>
                            <div className="text-sm">{gainPercent.toFixed(1)}%</div>
                          </div>
                        </td>
                        <td className="border p-3 text-right" style={{ borderColor: '#ddd' }}>
                          {property.rentAmount ? formatCurrency(property.rentAmount) : '-'}
                        </td>
                        <td className="border p-3 text-center" style={{ borderColor: '#ddd' }}>
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={e => { e.stopPropagation(); openPropertyForm(property); }}
                              className="px-2 py-1 text-white rounded text-xs hover:opacity-90"
                              style={{ backgroundColor: 'var(--primary)' }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); deleteProperty(property.id); }}
                              className="px-2 py-1 text-white rounded text-xs hover:opacity-90"
                              style={{ backgroundColor: 'var(--danger)' }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Property Details */}
        {selectedProperty && (
          <div className="p-4 rounded shadow" style={{ backgroundColor: 'var(--background-2)' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Property Details</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => openExpenseForm(selectedProperty)}
                  className="px-3 py-1 text-white rounded text-sm hover:opacity-90"
                  style={{ backgroundColor: 'var(--warning)' }}
                >
                  Add Expense
                </button>
                <button onClick={() => setSelectedProperty(null)} className="text-gray-500">✕</button>
              </div>
            </div>

            {(() => {
              const property = properties.find(p => p.id === selectedProperty);
              const propertyExpenses = expenses.filter(e => e.propertyId === selectedProperty);
              
              if (!property) return null;

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Address:</span>
                        <span>{property.address}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Purchase Price:</span>
                        <span>{formatCurrency(property.purchasePrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Current Value:</span>
                        <span>{formatCurrency(property.currentValue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Purchase Date:</span>
                        <span>{new Date(property.purchaseDate).toLocaleDateString()}</span>
                      </div>
                      {property.rentAmount && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Monthly Rent:</span>
                          <span className="text-green-600 font-semibold">{formatCurrency(property.rentAmount)}</span>
                        </div>
                      )}
                      {property.mortgageBalance && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Mortgage:</span>
                          <span className="text-red-600">{formatCurrency(property.mortgageBalance)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Recent Expenses ({propertyExpenses.length})</h4>
                    {propertyExpenses.length === 0 ? (
                      <p className="text-gray-500 text-sm">No expenses recorded</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {propertyExpenses.slice(-5).map(expense => (
                          <div key={expense.id} className="flex justify-between p-2 rounded" style={{ backgroundColor: 'var(--background)' }}>
                            <div>
                              <div className="text-sm font-medium">{expense.description}</div>
                              <div className="text-xs text-gray-500">
                                {expense.type} • {new Date(expense.date).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="text-red-600 font-semibold">{formatCurrency(expense.amount)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Property Form Modal */}
        {showPropertyForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div 
              className="bg-white p-6 rounded shadow-lg w-full max-w-md"
              style={{ backgroundColor: 'var(--background-2)', color: 'var(--text)' }}
            >
              <h3 className="text-lg font-semibold mb-4">
                {editingProperty ? 'Edit Property' : 'Add Property'}
              </h3>
              
              <form onSubmit={handlePropertySubmit} className="space-y-4">
                <div>
                  <label className="block font-medium mb-1">Name*</label>
                  <input
                    type="text"
                    required
                    className="w-full border rounded p-2"
                    style={{ backgroundColor: 'var(--background)', borderColor: '#ddd' }}
                    value={propertyForm.name}
                    onChange={e => setPropertyForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1">Address*</label>
                  <input
                    type="text"
                    required
                    className="w-full border rounded p-2"
                    style={{ backgroundColor: 'var(--background)', borderColor: '#ddd' }}
                    value={propertyForm.address}
                    onChange={e => setPropertyForm(prev => ({ ...prev, address: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium mb-1">Type</label>
                    <select
                      className="w-full border rounded p-2"
                      style={{ backgroundColor: 'var(--background)', borderColor: '#ddd' }}
                      value={propertyForm.type}
                      onChange={e => setPropertyForm(prev => ({ ...prev, type: e.target.value }))}
                    >
                      <option value="HOUSE">House</option>
                      <option value="APARTMENT">Apartment</option>
                      <option value="CONDO">Condo</option>
                      <option value="LAND">Land</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium mb-1">Status</label>
                    <select
                      className="w-full border rounded p-2"
                      style={{ backgroundColor: 'var(--background)', borderColor: '#ddd' }}
                      value={propertyForm.status}
                      onChange={e => setPropertyForm(prev => ({ ...prev, status: e.target.value }))}
                    >
                      <option value="OWNED">Owned</option>
                      <option value="RENTED">Rented</option>
                      <option value="VACANT">Vacant</option>
                      <option value="FOR_SALE">For Sale</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium mb-1">Purchase Price*</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      className="w-full border rounded p-2"
                      style={{ backgroundColor: 'var(--background)', borderColor: '#ddd' }}
                      value={propertyForm.purchasePrice}
                      onChange={e => setPropertyForm(prev => ({ ...prev, purchasePrice: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block font-medium mb-1">Current Value*</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      className="w-full border rounded p-2"
                      style={{ backgroundColor: 'var(--background)', borderColor: '#ddd' }}
                      value={propertyForm.currentValue}
                      onChange={e => setPropertyForm(prev => ({ ...prev, currentValue: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium mb-1">Purchase Date*</label>
                  <input
                    type="date"
                    required
                    className="w-full border rounded p-2"
                    style={{ backgroundColor: 'var(--background)', borderColor: '#ddd' }}
                    value={propertyForm.purchaseDate}
                    onChange={e => setPropertyForm(prev => ({ ...prev, purchaseDate: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium mb-1">Monthly Rent</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full border rounded p-2"
                      style={{ backgroundColor: 'var(--background)', borderColor: '#ddd' }}
                      value={propertyForm.rentAmount}
                      onChange={e => setPropertyForm(prev => ({ ...prev, rentAmount: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block font-medium mb-1">Mortgage Balance</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full border rounded p-2"
                      style={{ backgroundColor: 'var(--background)', borderColor: '#ddd' }}
                      value={propertyForm.mortgageBalance}
                      onChange={e => setPropertyForm(prev => ({ ...prev, mortgageBalance: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPropertyForm(false)}
                    className="flex-1 px-4 py-2 border rounded hover:opacity-90"
                    style={{ borderColor: '#ddd' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 text-white rounded hover:opacity-90"
                    style={{ backgroundColor: 'var(--success)' }}
                  >
                    {editingProperty ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Expense Form Modal */}
        {showExpenseForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div 
              className="bg-white p-6 rounded shadow-lg w-full max-w-md"
              style={{ backgroundColor: 'var(--background-2)', color: 'var(--text)' }}
            >
              <h3 className="text-lg font-semibold mb-4">Add Expense</h3>
              
              <form onSubmit={handleExpenseSubmit} className="space-y-4">
                <div>
                  <label className="block font-medium mb-1">Property*</label>
                  <select
                    required
                    className="w-full border rounded p-2"
                    style={{ backgroundColor: 'var(--background)', borderColor: '#ddd' }}
                    value={expenseForm.propertyId}
                    onChange={e => setExpenseForm(prev => ({ ...prev, propertyId: e.target.value }))}
                  >
                    <option value="">Select Property</option>
                    {properties.map(property => (
                      <option key={property.id} value={property.id}>
                        {property.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium mb-1">Type</label>
                    <select
                      className="w-full border rounded p-2"
                      style={{ backgroundColor: 'var(--background)', borderColor: '#ddd' }}
                      value={expenseForm.type}
                      onChange={e => setExpenseForm(prev => ({ ...prev, type: e.target.value }))}
                    >
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="INSURANCE">Insurance</option>
                      <option value="TAXES">Taxes</option>
                      <option value="MORTGAGE">Mortgage</option>
                      <option value="UTILITIES">Utilities</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium mb-1">Amount*</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      className="w-full border rounded p-2"
                      style={{ backgroundColor: 'var(--background)', borderColor: '#ddd' }}
                      value={expenseForm.amount}
                      onChange={e => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium mb-1">Description*</label>
                  <input
                    type="text"
                    required
                    className="w-full border rounded p-2"
                    style={{ backgroundColor: 'var(--background)', borderColor: '#ddd' }}
                    value={expenseForm.description}
                    onChange={e => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1">Date*</label>
                  <input
                    type="date"
                    required
                    className="w-full border rounded p-2"
                    style={{ backgroundColor: 'var(--background)', borderColor: '#ddd' }}
                    value={expenseForm.date}
                    onChange={e => setExpenseForm(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowExpenseForm(false)}
                    className="flex-1 px-4 py-2 border rounded hover:opacity-90"
                    style={{ borderColor: '#ddd' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 text-white rounded hover:opacity-90"
                    style={{ backgroundColor: 'var(--warning)' }}
                  >
                    Add Expense
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}