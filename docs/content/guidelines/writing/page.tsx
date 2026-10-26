import { PackageOpen } from 'lucide-react'
import { Button } from '@feeef.dev/ui/primitives/button'
import { TextField } from '@feeef.dev/ui/primitives/text-field'
import { formatMessage } from '@feeef.dev/ui/i18n-core'
import { definePage } from '../../../src/model'
import { Link } from '../../../src/router'
import { C, Code } from '../../../src/blocks/code'
import { Callout, DoDont, Lead, Section, Table } from '../../../src/blocks/prose'
import { Compare } from '../_lib/compare'
import './writing.css'

/* ---------- Demos ---------- */

function DialogMock({
  title,
  body,
  cancel,
  confirm,
}: {
  title: string
  body: string
  cancel: string
  confirm: string
}) {
  return (
    <div className="gw-dialog" role="group" aria-label={title}>
      <h4>{title}</h4>
      <p>{body}</p>
      <div className="gw-dialog-actions">
        <Button variant="text" controlSize="small">
          {cancel}
        </Button>
        <Button variant="destructive" controlSize="small">
          {confirm}
        </Button>
      </div>
    </div>
  )
}

const ORDERS_PLURAL = {
  en: '{count, plural, =0 {No orders} one {# order} other {# orders}}',
  fr: '{count, plural, =0 {Aucune commande} one {# commande} other {# commandes}}',
  ar: '{count, plural, zero {لا طلبات} one {طلب واحد} two {طلبان} few {# طلبات} many {# طلبًا} other {# طلب}}',
} as const

function PluralGood() {
  return (
    <ul className="gw-lines">
      {[0, 1, 2].map((count) => (
        <li key={`fr-${count}`}>
          <span lang="fr">{formatMessage(ORDERS_PLURAL.fr, 'fr', { count })}</span>
          <small>fr · {count}</small>
        </li>
      ))}
      {[2, 3, 11, 100].map((count) => (
        <li key={`ar-${count}`}>
          <span lang="ar" dir="rtl">
            {formatMessage(ORDERS_PLURAL.ar, 'ar', { count })}
          </span>
          <small>ar · {count}</small>
        </li>
      ))}
    </ul>
  )
}

function PluralBad() {
  return (
    <ul className="gw-lines">
      {[0, 1, 2].map((count) => (
        <li key={`fr-${count}`}>
          <span lang="fr">{`${count} commande(s)`}</span>
          <small>fr · {count}</small>
        </li>
      ))}
      {[2, 3, 11, 100].map((count) => (
        <li key={`ar-${count}`}>
          <span lang="ar" dir="rtl">{`${count} طلب`}</span>
          <small>ar · {count}</small>
        </li>
      ))}
    </ul>
  )
}

function IsolatedPhone() {
  return (
    <p className="gw-rtl" lang="ar" dir="rtl">
      اتصل بالزبون على <bdi>0555 12 34 56</bdi> لتأكيد الطلب <bdi>#10482</bdi>.
    </p>
  )
}

function BrokenPhone() {
  return (
    <p className="gw-rtl" lang="ar" dir="rtl">
      اتصل بالزبون على 0555 12 34 56 لتأكيد الطلب #10482.
    </p>
  )
}

/* ---------- Page ---------- */

function Overview() {
  return (
    <>
      <Lead>
        Words are the interface people read most. A confirmation agent makes hundreds of calls a day
        through the same few labels, so every word should be the shortest one that is still exact. These
        rules apply to English, Arabic and French alike.
      </Lead>
      <Callout title="The one-line version">
        <p>
          Say what happens, in plain words, where it happens. Name the thing, say the number, give the next
          step. See <Link to="/guidelines/principles#speak-like-a-colleague">principle 8</Link>.
        </p>
      </Callout>

      <Section title="Sentence case" id="sentence-case">
        <p>
          Capitalize only the first word and proper nouns, everywhere: titles, buttons, menu items,
          labels, tabs. It is easier to read, translates cleanly, and doesn’t shout. Brand and place names
          keep their capitals: Feeef, Yalidine, ZR Express, Bab Ezzouar.
        </p>
        <Table
          head={['Before', 'After']}
          rows={[
            ['Confirm Order', 'Confirm order'],
            ['ADD NEW PRODUCT', 'Add product'],
            ['Delivery Type', 'Delivery type'],
            ['Connect To Yalidine', 'Connect Yalidine'],
            ['Order Status: Shipped', 'Shipped'],
          ]}
        />
        <Compare
          good={
            <div className="demo-row">
              <Button variant="tonal">Export orders</Button>
              <Button variant="filled">Add product</Button>
            </div>
          }
          goodNote="Sentence case reads as a calm instruction."
          bad={
            <div className="demo-row">
              <Button variant="tonal">Export Orders</Button>
              <Button variant="filled">ADD NEW PRODUCT</Button>
            </div>
          }
          badNote="Title case and capitals shout, and capitals don’t exist in Arabic anyway."
        />
      </Section>

      <Section title="Buttons say what happens" id="buttons">
        <p>
          A button label is a verb, plus the object when it isn’t obvious. People should know the outcome
          before they press. Keep it to two or three words; the object can carry a count or a name.
        </p>
        <Table
          head={['Before', 'After', 'Why']}
          rows={[
            ['Submit', 'Confirm order', 'Names the outcome, not the mechanism.'],
            ['OK', 'Cancel order', 'In a confirmation, the button repeats the verb of the question.'],
            ['Yes / No', 'Delete 3 products / Keep products', 'Each button makes sense on its own.'],
            ['Click here', 'View delivery report', 'Link text says where it goes.'],
            ['Continue', 'Pay 1 250 DA', 'When money moves, say how much.'],
            ['New', 'Add product', 'A verb, then the object.'],
          ]}
        />
        <Compare
          good={
            <div className="demo-row">
              <Button variant="text">Call back later</Button>
              <Button variant="filled">Confirm order</Button>
            </div>
          }
          goodNote="Both labels say what happens to the order."
          bad={
            <div className="demo-row">
              <Button variant="text">Back</Button>
              <Button variant="filled">Submit</Button>
            </div>
          }
          badNote="“Submit” what? The agent has to remember what this screen does."
        />
      </Section>

      <Section title="Hints, supporting text and errors" id="fields">
        <p>Every field has up to three pieces of text, and each has one job.</p>
        <Table
          head={['Part', 'Job', 'Example']}
          rows={[
            [<C>hint</C>, 'Names the value. A noun of one to three words; it floats and stays visible.', '“Customer phone”'],
            [<C>supportingText</C>, 'Format, limits or consequence, shown before anyone types.', '“10 digits, starting with 05, 06 or 07.”'],
            [<C>error</C>, 'What is wrong and how to fix it. Replaces the supporting text.', '“Enter all 10 digits, starting with 05, 06 or 07.”'],
            [<C>placeholder</C>, 'An example value, only when the field is already named around it.', '“Search orders”'],
          ]}
        />
        <Compare
          good={
            <div className="demo-column">
              <TextField
                hint="Delivery address"
                supportingText="Street, building and commune. The courier reads this on the phone."
              />
            </div>
          }
          goodNote="A short name, and help that stays visible while typing."
          bad={
            <div className="demo-column">
              <TextField hint="Please enter the full delivery address of the customer" />
            </div>
          }
          badNote="An instruction as the name: it truncates, and the help is gone once it floats."
        />

        <Section title="Errors" id="errors" level={3}>
          <p>
            An error is two things: what is wrong, and how to fix it. Write it at the field when one field
            is wrong, and in the page next to the task when the whole task is blocked (see{' '}
            <Link to="/guidelines/choosing#feedback">Feedback</Link>). Never show a code or a field name
            on its own; put technical detail in a second line people can copy for support.
          </p>
          <Table
            head={['Before', 'After']}
            rows={[
              ['Invalid input.', 'Enter all 10 digits, starting with 05, 06 or 07.'],
              ['Wilaya is required', 'Choose the wilaya the order ships to.'],
              ['Failed to send order to delivery service', 'Yalidine didn’t accept this order. Check the commune, then send it again.'],
              ['Order products default to different courier accounts; pick carrierAccountId', 'These products ship from different courier accounts. Choose one courier for this order.'],
              ['Error 429', 'You have used today’s 5 free generations. Add funds to keep going.'],
              ['Something went wrong', 'Orders could not load. Check your connection and try again.'],
            ]}
          />
          <DoDont
            doItems={[
              'Start with the fix when it is obvious: “Choose a courier.”',
              'Say what was kept: “Your draft is saved.”',
              'Translate every message; an English sentence in an Arabic screen reads as a crash.',
            ]}
            dontItems={[
              'Blame: “You entered a wrong number.”',
              'Leak internals: field names, ids, stack traces, HTTP codes.',
              'Apologize at length or joke. One clear sentence is the respectful version.',
            ]}
          />
        </Section>
      </Section>

      <Section title="Empty states" id="empty-states">
        <p>
          An empty screen is often someone’s first look at a feature. Say what goes here, how it gets
          filled, and offer the one action that starts it. A list that is empty because of a filter says
          so and offers to clear it.
        </p>
        <Table
          head={['Case', 'Title', 'Text', 'Action']}
          rows={[
            ['First use', 'No orders yet', 'Orders from your store appear here as soon as a customer checks out.', 'Copy store link'],
            ['Filtered', 'No orders match these filters', 'Try a wider period or another wilaya.', 'Clear filters'],
            ['Done', 'All calls done', 'New orders will join the queue as they arrive.', 'View confirmed orders'],
            ['Failed', 'Orders could not load', 'Check your connection. Nothing was lost.', 'Try again'],
          ]}
        />
        <Compare
          good={
            <div className="gw-empty">
              <span className="gw-empty-mark" aria-hidden="true">
                <PackageOpen size={22} />
              </span>
              <h4>No orders yet</h4>
              <p>Orders from your store appear here as soon as a customer checks out.</p>
              <Button variant="tonal">Copy store link</Button>
            </div>
          }
          goodNote="What goes here, how it fills, and the action that starts it."
          bad={
            <div className="gw-empty">
              <p>No data</p>
            </div>
          }
          badNote="True, but it reads like a bug, and leaves the merchant with nothing to do."
        />
      </Section>

      <Section title="Confirmations" id="confirmations">
        <p>
          Confirm only what can’t be undone or costs money. Ask the question with the object’s name, say
          the consequence in one sentence, and label the buttons with verbs: the destructive one repeats
          the verb of the question, the safe one says what is kept.
        </p>
        <Table
          head={['Part', 'Before', 'After']}
          rows={[
            ['Title', 'Are you sure?', 'Cancel order #10482?'],
            ['Body', 'This action cannot be undone.', 'The customer won’t be called again, and the reserved stock goes back to inventory.'],
            ['Buttons', 'No · Yes', 'Keep order · Cancel order'],
            ['Delete', 'Confirm delete', 'Delete “Summer poster”? This cannot be undone.'],
          ]}
        />
        <Compare
          good={
            <DialogMock
              title="Cancel order #10482?"
              body="The customer won’t be called again, and the reserved stock goes back to inventory."
              cancel="Keep order"
              confirm="Cancel order"
            />
          }
          goodNote="Names the order and the consequence; each button says what it does."
          bad={
            <DialogMock
              title="Are you sure?"
              body="This action cannot be undone."
              cancel="No"
              confirm="Yes"
            />
          }
          badNote="Sure of what? Agents learn to press Yes without reading."
        />
      </Section>

      <Section title="Numbers, money, dates and phones" id="formats">
        <p>
          Feeef users are in Algeria. Write values the way they are written there, and format them with
          the locale instead of building strings by hand. Pass a region (<C>ar-DZ</C>, <C>fr-DZ</C>) to{' '}
          <C>Intl</C>: Arabic then keeps Western digits and the Algerian month names (جانفي، فيفري،
          جويلية، أوت).
        </p>
        <Table
          head={['Value', 'English', 'French', 'Arabic', 'Rule']}
          rows={[
            ['Money', '4,500 DA', '4 500 DA', '4.500 دج', 'Whole dinars, unit after the number. DZD only in exports, APIs and next to other currencies.'],
            ['Date', '21 Oct 2026', '21 oct. 2026', '21 أكتوبر 2026', 'Day, month as a word, year. Never 10/21/2026.'],
            ['Time', '14:30', '14:30', '14:30', '24-hour clock (hourCycle: h23).'],
            ['Phone', '0555 12 34 56', '0555 12 34 56', '0555 12 34 56', 'Show the national form in pairs; store +213555123456. Accept both when typed.'],
            ['Wilaya', '16 · Algiers', '16 · Alger', '16 · الجزائر', 'Code first: agents know wilayas by number.'],
            ['Order', 'Order #10482', 'Commande #10482', 'الطلب #10482', 'Isolate the number in right-to-left text.'],
          ]}
        />
        <Code
          code={`const locale = { ar: 'ar-DZ', fr: 'fr-DZ', en: 'en' }[lang]

// Money: "{amount} DA" in en/fr, "{amount} دج" in ar, so the unit is translated with the sentence.
const amount = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(4500)
t('money.da', { amount })

const day = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' })
const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })`}
        />
        <DoDont
          doItems={[
            'Say “Today, 14:30” and “Yesterday” for recent events in lists.',
            'Show counts as numbers: “3 orders”, not “three orders”.',
            'Put the unit in the message, not glued on in code.',
          ]}
          dontItems={[
            'Show centimes on prices; dinar prices are whole numbers.',
            'Write dates with slashes; month and day swap between languages.',
            'Format phone numbers as numbers (4 500 000 000).',
          ]}
        />
      </Section>

      <Section title="Tone and terms" id="tone">
        <p>
          Write like a helpful colleague next to the merchant: calm, direct, specific. Use “you” for the
          person, active verbs, no exclamation marks, no “Oops”, and “please” only when you ask for
          something unusual. Arabic is plain Modern Standard Arabic, as in the existing Feeef strings;
          courier and brand names stay in Latin script.
        </p>
        <Table
          head={['Before', 'After']}
          rows={[
            ['Oops! Something went wrong 😢', 'Orders could not load. Check your connection and try again.'],
            ['Amazing! Your order has been successfully confirmed!!!', 'Order confirmed.'],
            ['Please kindly click the button below to proceed', 'Confirm order'],
            ['The system was unable to process your request', 'The label could not print. Try again.'],
          ]}
        />
        <p>
          Use one word per concept, on every screen and in every language. When a word is in this table,
          use it; when you need a new one, add it here first.
        </p>
        <Table
          head={['English', 'Arabic', 'French']}
          rows={[
            ['Order', 'طلب', 'Commande'],
            ['Delivery company', 'شركة التوصيل', 'Société de livraison'],
            ['Home delivery', 'توصيل إلى المنزل', 'Livraison à domicile'],
            ['Stop desk (pickup office)', 'مكتب الاستلام', 'Bureau de retrait'],
            ['Wilaya', 'ولاية', 'Wilaya'],
            ['Commune', 'بلدية', 'Commune'],
            ['Confirmation call', 'مكالمة التأكيد', 'Appel de confirmation'],
            ['Cash on delivery', 'الدفع عند الاستلام', 'Paiement à la livraison'],
            ['Wallet', 'المحفظة', 'Portefeuille'],
          ]}
        />
      </Section>

      <Section title="Write for translation" id="translation">
        <p>
          Every string will exist in Arabic and French. Write one complete message per sentence, with
          parameters for the parts that change, and let <C>useI18n().t()</C> format it (see{' '}
          <Link to="/get-started/internationalization">Internationalization</Link>).
        </p>
        <Table
          head={['Rule', 'Why']}
          rows={[
            ['No concatenation. One key per sentence, with {params}.', 'Word order changes: Arabic puts the verb first (تم شحن الطلب {id}).'],
            ['Plurals in ICU, with every form the language has.', 'Arabic has six forms (zero, one, two, few, many, other); French counts 0 as singular.'],
            ['No markup split across keys.', 'Translators can’t move a bold word if it is a separate string.'],
            ['Leave room: French runs about 30% longer.', 'Labels that just fit in English clip in French.'],
            ['No idioms, puns or abbreviations.', 'They don’t translate, and “Qty” or “N°” confuse.'],
            ['Name keys by place and meaning: orders.cancel.title.', 'Translators see where the string is used.'],
          ]}
        />
        <Code
          code={`// ✗ Three fragments: wrong word order in Arabic, wrong agreement in French.
\`\${t('orders.order')} \${id} \${t('orders.shipped')}\`

// ✓ One message per sentence.
// en: "Order {id} shipped"   fr: "Commande {id} expédiée"   ar: "تم شحن الطلب {id}"
t('orders.shippedToast', { id })

// ✓ Plurals with every form.
// ar: "{count, plural, zero {لا طلبات} one {طلب واحد} two {طلبان} few {# طلبات} many {# طلبًا} other {# طلب}}"
t('orders.count', { count })`}
        />
        <Compare
          good={<PluralGood />}
          goodNote="ICU plurals: French says “Aucune commande”, Arabic picks the right form for 2, 3, 11 and 100."
          bad={<PluralBad />}
          badNote="“(s)” and a fixed noun: wrong in French, and wrong in Arabic for almost every count."
        />
      </Section>

      <Section title="Punctuation that survives right-to-left" id="punctuation">
        <p>
          Arabic and French have their own punctuation, and right-to-left text reorders anything written
          left to right inside it. Write punctuation inside the translated message, never in code.
        </p>
        <Table
          head={['Language', 'Rule', 'Example']}
          rows={[
            ['Arabic', 'Arabic comma, question mark and semicolon: ، ؟ ؛ and «» quotes.', 'حذف «{title}»؟'],
            ['French', 'A no-break space before ? ! : ; and inside « ».', 'Supprimer «\u202F{title}\u202F»\u202F?'],
            ['All', 'Isolate phone numbers, order numbers, SKUs, emails and URLs in <bdi> (or dir="auto").', 'اتصل على <bdi>0555 12 34 56</bdi>'],
            ['All', 'No arrows or < > as direction in text; use an icon with lab-dir-flip.', '“Next →” becomes “Next” + icon'],
          ]}
        />
        <Compare
          good={<IsolatedPhone />}
          goodNote={<>The phone number in <C>{'<bdi>'}</C> reads 0555 12 34 56, as dialed.</>}
          bad={<BrokenPhone />}
          badNote="Without isolation the groups reverse: the agent dials 56 34 12 0555."
        />
      </Section>
    </>
  )
}

export default definePage({
  section: 'guidelines',
  id: 'writing',
  title: 'Writing',
  order: 5,
  summary:
    'How to word labels, buttons, errors, empty states and confirmations, and how to write numbers, dates and phones for Algeria in Arabic, French and English.',
  keywords: [
    'copy',
    'ux writing',
    'microcopy',
    'sentence case',
    'error messages',
    'empty state',
    'confirmation',
    'currency',
    'DZD',
    'DA',
    'phone format',
    'plural',
    'ICU',
    'Arabic',
    'French',
    'RTL',
    'tone',
  ],
  Overview,
})
