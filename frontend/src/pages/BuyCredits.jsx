import { useState, useEffect } from "react";
import axios from "axios";
import { API, useAuth } from "@/App";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { CreditCard, CheckCircle, Clock, Loader2, Banknote, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const PACKAGES = [
  { id: "single", name: "Single Session", price: 30, credits: 1, description: "Perfect for trying us out", features: ["1 training session", "Valid for 30 days", "Book any slot"], popular: false },
  { id: "double", name: "Duo Pack", price: 40, credits: 2, description: "Save $20 with this bundle", features: ["2 training sessions", "Valid for 60 days", "Flexible booking"], popular: false },
  { id: "unlimited", name: "Unlimited Monthly", price: 50, credits: 999, description: "Best value for regulars", features: ["Unlimited sessions", "Valid for 30 days", "Priority booking"], popular: true }
];

const BuyCredits = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [purchasing, setPurchasing] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    axios.get(`${API}/credits/transactions`)
      .then(res => setTransactions(res.data))
      .catch(err => console.error(err));
  }, []);

  const handlePurchase = async () => {
    if (!selectedPackage) return;
    setPurchasing(true);
    try {
      const res = await axios.post(`${API}/credits/purchase`, {
        package_type: selectedPackage,
        payment_method: paymentMethod
      });
      toast.success(res.data.message);
      setShowDialog(true);
      setSelectedPackage(null);
      const txnRes = await axios.get(`${API}/credits/transactions`);
      setTransactions(txnRes.data);
    } catch (err) {
      toast.error("Failed to process purchase");
    } finally {
      setPurchasing(false);
    }
  };

  const selectedPkg = PACKAGES.find(p => p.id === selectedPackage);
  const creditDisplay = user.has_unlimited ? "Unlimited" : `${user.credits} Credits`;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1A1A1A]" style={{ fontFamily: "Playfair Display, serif" }}>Buy Credits</h1>
          <p className="text-[#737373] mt-2">Choose a package that suits your training needs</p>
        </div>

        <div className="card-base bg-gradient-to-r from-[#FDF2F2] to-white mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#F5D5D5] flex items-center justify-center">
              <CreditCard className="w-7 h-7 text-[#1A1A1A]" />
            </div>
            <div>
              <p className="text-sm text-[#737373]">Current Balance</p>
              <p className="text-2xl font-bold text-[#1A1A1A]" data-testid="current-balance">{creditDisplay}</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {PACKAGES.map(pkg => {
            const isSelected = selectedPackage === pkg.id;
            return (
              <div
                key={pkg.id}
                className={`card-base cursor-pointer transition-all ${isSelected ? "ring-2 ring-[#1A1A1A] shadow-lg" : "hover:shadow-lg"} ${pkg.popular ? "relative" : ""}`}
                onClick={() => setSelectedPackage(pkg.id)}
                data-testid={`package-${pkg.id}`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#1A1A1A] text-white text-xs font-medium rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Best Value
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-[#1A1A1A] mb-1" style={{ fontFamily: "Playfair Display, serif" }}>{pkg.name}</h3>
                  <p className="text-sm text-[#737373]">{pkg.description}</p>
                  <p className="text-4xl font-bold text-[#1A1A1A] mt-4">${pkg.price}</p>
                </div>
                <ul className="space-y-3 mb-6">
                  {pkg.features.map(f => (
                    <li key={f} className="flex items-center gap-3 text-[#737373]">
                      <CheckCircle className="w-5 h-5 text-[#8FB392] flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className={`w-full h-12 rounded-full flex items-center justify-center font-medium transition-all ${isSelected ? "bg-[#1A1A1A] text-white" : "bg-[#F5F5F5] text-[#737373]"}`}>
                  {isSelected ? "Selected" : "Select"}
                </div>
              </div>
            );
          })}
        </div>

        {selectedPackage && selectedPkg && (
          <div className="card-base mb-8 animate-fade-in">
            <h3 className="text-xl font-semibold text-[#1A1A1A] mb-4" style={{ fontFamily: "Playfair Display, serif" }}>Payment Method</h3>
            <p className="text-[#737373] mb-6">Select how you will pay. Credits will be added once payment is confirmed by admin.</p>
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === "cash" ? "border-[#1A1A1A] bg-[#FAFAFA]" : "border-[#E5E5E5] hover:border-[#737373]"}`}
                onClick={() => setPaymentMethod("cash")}
                data-testid="payment-cash"
              >
                <div className="flex items-center gap-3">
                  <Banknote className="w-6 h-6 text-[#8FB392]" />
                  <div>
                    <p className="font-medium text-[#1A1A1A]">Cash on Arrival</p>
                    <p className="text-sm text-[#737373]">Pay at your next session</p>
                  </div>
                </div>
              </div>
              <div
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === "transfer" ? "border-[#1A1A1A] bg-[#FAFAFA]" : "border-[#E5E5E5] hover:border-[#737373]"}`}
                onClick={() => setPaymentMethod("transfer")}
                data-testid="payment-transfer"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-6 h-6 text-[#8FA6B3]" />
                  <div>
                    <p className="font-medium text-[#1A1A1A]">Direct Transfer</p>
                    <p className="text-sm text-[#737373]">Bank transfer details provided</p>
                  </div>
                </div>
              </div>
            </div>
            <Button onClick={handlePurchase} disabled={purchasing} className="w-full btn-primary h-14" data-testid="confirm-purchase-btn">
              {purchasing ? <Loader2 className="w-5 h-5 animate-spin" /> : `Request ${selectedPkg.name} - $${selectedPkg.price}`}
            </Button>
          </div>
        )}

        {transactions.length > 0 && (
          <div>
            <h3 className="text-xl font-semibold text-[#1A1A1A] mb-4" style={{ fontFamily: "Playfair Display, serif" }}>Purchase History</h3>
            <div className="space-y-3">
              {transactions.map(txn => {
                const txnPkg = PACKAGES.find(p => p.id === txn.package_type);
                const isConfirmed = txn.status === "confirmed";
                return (
                  <div key={txn.transaction_id} className="card-base flex items-center justify-between" data-testid={`transaction-${txn.transaction_id}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isConfirmed ? "bg-[#8FB392]/20" : "bg-[#E6C785]/20"}`}>
                        {isConfirmed ? <CheckCircle className="w-5 h-5 text-[#5A8F5E]" /> : <Clock className="w-5 h-5 text-[#B8963A]" />}
                      </div>
                      <div>
                        <p className="font-medium text-[#1A1A1A]">{txnPkg ? txnPkg.name : txn.package_type}</p>
                        <p className="text-sm text-[#737373]">{new Date(txn.created_at).toLocaleDateString()} - {txn.payment_method}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[#1A1A1A]">${txn.amount}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${isConfirmed ? "bg-[#8FB392]/20 text-[#5A8F5E]" : "bg-[#E6C785]/20 text-[#B8963A]"}`}>{txn.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center" style={{ fontFamily: "Playfair Display, serif" }}>Purchase Request Submitted!</DialogTitle>
              <DialogDescription className="text-center">
                {paymentMethod === "cash" 
                  ? "Please bring cash to your next session. Stephanie will confirm your purchase and credits will be added to your account."
                  : "Please complete your bank transfer. Once confirmed, your credits will be added to your account."}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center mt-4">
              <Button onClick={() => setShowDialog(false)} className="btn-primary">Got it!</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default BuyCredits;
