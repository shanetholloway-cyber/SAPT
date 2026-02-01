import { useState, useEffect } from "react";
import axios from "axios";
import { API, useAuth } from "@/App";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { CreditCard, CheckCircle, Clock, Loader2, Banknote } from "lucide-react";

function CreditsPage() {
  const authContext = useAuth();
  const user = authContext.user;
  const [transactions, setTransactions] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [purchasing, setPurchasing] = useState(false);

  useEffect(function() {
    axios.get(API + "/credits/transactions")
      .then(function(response) { setTransactions(response.data); })
      .catch(function(error) { console.error(error); });
  }, []);

  function handlePurchase() {
    if (!selectedPackage) return;
    setPurchasing(true);
    axios.post(API + "/credits/purchase", { package_type: selectedPackage, payment_method: paymentMethod })
      .then(function(response) {
        toast.success(response.data.message);
        setSelectedPackage(null);
        return axios.get(API + "/credits/transactions");
      })
      .then(function(response) { setTransactions(response.data); })
      .catch(function() { toast.error("Failed to process purchase"); })
      .finally(function() { setPurchasing(false); });
  }

  var creditText = user.has_unlimited ? "Unlimited" : String(user.credits) + " Credits";

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
              <p className="text-2xl font-bold text-[#1A1A1A]" data-testid="current-balance">{creditText}</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <PackageCard id="single" name="Single Session" price={30} description="Perfect for trying us out" features={["1 training session", "Valid for 30 days"]} popular={false} selected={selectedPackage === "single"} onSelect={function() { setSelectedPackage("single"); }} />
          <PackageCard id="double" name="Duo Pack" price={40} description="Save $20 with this bundle" features={["2 training sessions", "Flexible booking"]} popular={false} selected={selectedPackage === "double"} onSelect={function() { setSelectedPackage("double"); }} />
          <PackageCard id="unlimited" name="Unlimited Monthly" price={50} description="Best value for regulars" features={["Unlimited sessions", "Priority booking"]} popular={true} selected={selectedPackage === "unlimited"} onSelect={function() { setSelectedPackage("unlimited"); }} />
        </div>

        {selectedPackage && (
          <div className="card-base mb-8">
            <h3 className="text-xl font-semibold text-[#1A1A1A] mb-4" style={{ fontFamily: "Playfair Display, serif" }}>Payment Method</h3>
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <PaymentOption method="cash" label="Cash on Arrival" desc="Pay at your next session" icon={Banknote} selected={paymentMethod === "cash"} onSelect={function() { setPaymentMethod("cash"); }} />
              <PaymentOption method="transfer" label="Direct Transfer" desc="Bank transfer details provided" icon={CreditCard} selected={paymentMethod === "transfer"} onSelect={function() { setPaymentMethod("transfer"); }} />
            </div>
            <Button onClick={handlePurchase} disabled={purchasing} className="w-full btn-primary h-14" data-testid="confirm-purchase-btn">
              {purchasing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm Purchase"}
            </Button>
          </div>
        )}

        {transactions.length > 0 && (
          <div>
            <h3 className="text-xl font-semibold text-[#1A1A1A] mb-4" style={{ fontFamily: "Playfair Display, serif" }}>Purchase History</h3>
            <div className="space-y-3">
              {transactions.map(function(txn) {
                return <TransactionCard key={txn.transaction_id} txn={txn} />;
              })}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function PackageCard(props) {
  var cardClass = props.selected ? "card-base cursor-pointer ring-2 ring-[#1A1A1A] shadow-lg" : "card-base cursor-pointer hover:shadow-lg";
  if (props.popular) cardClass = cardClass + " relative";
  return (
    <div className={cardClass} onClick={props.onSelect} data-testid={"package-" + props.id}>
      {props.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#1A1A1A] text-white text-xs font-medium rounded-full">Best Value</div>}
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-[#1A1A1A] mb-1" style={{ fontFamily: "Playfair Display, serif" }}>{props.name}</h3>
        <p className="text-sm text-[#737373]">{props.description}</p>
        <p className="text-4xl font-bold text-[#1A1A1A] mt-4">{"$" + props.price}</p>
      </div>
      <ul className="space-y-3 mb-6">
        {props.features.map(function(f) { return <li key={f} className="flex items-center gap-3 text-[#737373]"><CheckCircle className="w-5 h-5 text-[#8FB392]" />{f}</li>; })}
      </ul>
      <div className={props.selected ? "w-full h-12 rounded-full flex items-center justify-center font-medium bg-[#1A1A1A] text-white" : "w-full h-12 rounded-full flex items-center justify-center font-medium bg-[#F5F5F5] text-[#737373]"}>
        {props.selected ? "Selected" : "Select"}
      </div>
    </div>
  );
}

function PaymentOption(props) {
  var Icon = props.icon;
  var cls = props.selected ? "p-4 rounded-xl border-2 cursor-pointer border-[#1A1A1A] bg-[#FAFAFA]" : "p-4 rounded-xl border-2 cursor-pointer border-[#E5E5E5] hover:border-[#737373]";
  return (
    <div className={cls} onClick={props.onSelect} data-testid={"payment-" + props.method}>
      <div className="flex items-center gap-3">
        <Icon className="w-6 h-6 text-[#8FB392]" />
        <div>
          <p className="font-medium text-[#1A1A1A]">{props.label}</p>
          <p className="text-sm text-[#737373]">{props.desc}</p>
        </div>
      </div>
    </div>
  );
}

function TransactionCard(props) {
  var txn = props.txn;
  var bgClass = txn.status === "confirmed" ? "bg-[#8FB392]/20" : "bg-[#E6C785]/20";
  var badgeClass = txn.status === "confirmed" ? "bg-[#8FB392]/20 text-[#5A8F5E]" : "bg-[#E6C785]/20 text-[#B8963A]";
  return (
    <div className="card-base flex items-center justify-between" data-testid={"transaction-" + txn.transaction_id}>
      <div className="flex items-center gap-4">
        <div className={"w-10 h-10 rounded-xl flex items-center justify-center " + bgClass}>
          {txn.status === "confirmed" ? <CheckCircle className="w-5 h-5 text-[#5A8F5E]" /> : <Clock className="w-5 h-5 text-[#B8963A]" />}
        </div>
        <div>
          <p className="font-medium text-[#1A1A1A]">{txn.package_type}</p>
          <p className="text-sm text-[#737373]">{new Date(txn.created_at).toLocaleDateString()}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-semibold text-[#1A1A1A]">{"$" + txn.amount}</p>
        <span className={"text-xs px-2 py-1 rounded-full " + badgeClass}>{txn.status}</span>
      </div>
    </div>
  );
}

export default CreditsPage;
