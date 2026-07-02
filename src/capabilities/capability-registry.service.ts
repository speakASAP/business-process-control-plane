import { Injectable } from '@nestjs/common';

export interface ServiceCapability {
  service: string;
  role: string;
  capabilities: string[];
  missing: string[];
}

@Injectable()
export class CapabilityRegistryService {
  listCapabilities(): ServiceCapability[] {
    return [
      {
        service: 'marketing-microservice',
        role: 'campaign provider',
        capabilities: ['campaign-content-ref', 'experience-slot-content', 'upsell-content'],
        missing: ['canonical campaign content API'],
      },
      {
        service: 'catalog-microservice',
        role: 'product fact provider',
        capabilities: ['product-category-facts', 'product-tags', 'discount-eligibility-facts'],
        missing: ['final holiday eligibility fact schema'],
      },
      {
        service: '[MISSING: pricing service owner]',
        role: 'monetary authority',
        capabilities: ['discount-evaluation', 'final-price-quote'],
        missing: ['service owner', 'API contract'],
      },
      {
        service: '[MISSING: cart service owner]',
        role: 'cart display and checkout quote consumer',
        capabilities: ['discount-line-display', 'quote-to-checkout'],
        missing: ['service owner', 'API contract'],
      },
      {
        service: 'orders-microservice',
        role: 'immutable order snapshot owner',
        capabilities: ['applied-discounts-snapshot', 'order-lifecycle-events'],
        missing: ['final snapshot field contract'],
      },
      {
        service: 'invoices-microservice',
        role: 'invoice discount line renderer',
        capabilities: ['invoice-discount-lines'],
        missing: ['legal/tax display constraints'],
      },
      {
        service: 'notifications-microservice',
        role: 'post-purchase notification executor',
        capabilities: ['template-ref-delivery', 'idempotent-notification'],
        missing: ['final paid-order event contract'],
      },
    ];
  }
}
