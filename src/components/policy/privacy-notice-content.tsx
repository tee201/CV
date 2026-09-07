// Starting-point content only — not reviewed legal text. Before relying on
// this, have it checked against your actual processing activities and, if
// UK GDPR Article 35 applies to what you're collecting here (systematic
// monitoring of employees via location/photo evidence can trigger this),
// get a DPIA done. See README.md.
export function PrivacyNoticeContent() {
  return (
    <div className="flex flex-col gap-4 text-sm text-slate-700">
      <section>
        <h3 className="font-semibold text-slate-900">What we collect</h3>
        <p className="mt-1">
          Your name, work email, and phone number; your shift and attendance times; which vehicle you used;
          interior handover photos when you use a company vehicle (driver/cab area, rear/passenger area, cargo
          area); holiday requests; and incident reports you submit.
        </p>
      </section>
      <section>
        <h3 className="font-semibold text-slate-900">Why</h3>
        <p className="mt-1">
          To run the rota, pay you correctly, keep a record of company vehicle condition at handover, process
          holiday requests, and respond to incidents. We rely on this being necessary for your employment contract,
          or our legitimate interest in operating the business safely — not on asking your consent for each of
          these, since consent isn&apos;t considered a valid basis for ordinary employment records.
        </p>
      </section>
      <section>
        <h3 className="font-semibold text-slate-900">Who can see it</h3>
        <p className="mt-1">
          You can see your own records. Managers/admins can see operational records for all drivers, to run the
          rota and respond to incidents and holiday requests. We don&apos;t sell or share this data outside the
          company.
        </p>
      </section>
      <section>
        <h3 className="font-semibold text-slate-900">How long we keep it</h3>
        <p className="mt-1">
          We keep records no longer than needed for the purposes above. Specific retention periods for each record
          type are set by company policy, not by this app — ask your manager if you want the current periods.
        </p>
      </section>
      <section>
        <h3 className="font-semibold text-slate-900">Your rights</h3>
        <p className="mt-1">
          You can ask to see what we hold about you, ask us to correct it, and raise a concern with your manager or
          the Information Commissioner&apos;s Office (ico.org.uk) if you think we&apos;ve got this wrong.
        </p>
      </section>
    </div>
  );
}
